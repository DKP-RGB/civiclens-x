"""Ingestion orchestration with one provenance row per source.

Each import is recorded in ``ingestion_runs`` before any network call, so a
failure or timeout is visible in the API instead of silently leaving old data.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.geospatial.dataset import grid_cells
from app.ingestion.features import compute_cell_features, prepare_polygons
from app.ingestion.open_meteo import fetch_archive, fetch_forecast
from app.ingestion.overpass import OverpassError, fetch_landuse
from app.ingestion.works import fetch_construction
from app.models.cell_feature import CellFeature
from app.models.construction import ConstructionSite
from app.models.ingestion import IngestionRun
from app.models.weather import WeatherDaily, WeatherForecast
from app.utils.time import now_iso, today_utc

SOURCE_ARCHIVE = "open-meteo-archive"
SOURCE_FORECAST = "open-meteo-forecast"
SOURCE_OSM_LANDUSE = "osm-landuse"
SOURCE_OSM_CONSTRUCTION = "osm-construction"

# ERA5 reanalysis (behind the archive endpoint) lags roughly five days.
ARCHIVE_LAG_DAYS = 5

Work = Callable[[], tuple[int, str]]


def _num(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _int(value: Any) -> int | None:
    number = _num(value)
    return None if number is None else int(round(number))


def _series(daily: dict[str, Any], key: str) -> list[Any]:
    values = daily.get(key)
    return values if isinstance(values, list) else []


def _execute(db: Session, source: str, work: Work) -> IngestionRun:
    run = IngestionRun(
        id=f"run-{uuid4().hex[:12]}",
        source=source,
        status="running",
        started_at=now_iso(),
        records_written=0,
    )
    db.add(run)
    db.commit()

    try:
        written, detail = work()
    except Exception as exc:  # noqa: BLE001 - recorded and re-raised on purpose
        db.rollback()
        failed = db.get(IngestionRun, run.id)
        if failed is not None:
            failed.status = "failed"
            failed.finished_at = now_iso()
            failed.detail = str(exc)[:1000]
            db.commit()
        raise

    finished = db.get(IngestionRun, run.id)
    if finished is not None:
        finished.status = "success"
        finished.finished_at = now_iso()
        finished.records_written = written
        finished.detail = detail
        db.commit()
        return finished
    return run


def ingest_archive(
    db: Session,
    *,
    days: int = 30,
    transport: Any | None = None,
    today: date | None = None,
) -> IngestionRun:
    """Upsert daily historical rainfall from the Open-Meteo archive."""
    end = (today or today_utc()) - timedelta(days=ARCHIVE_LAG_DAYS)
    start = end - timedelta(days=max(1, days) - 1)

    def work() -> tuple[int, str]:
        payload = fetch_archive(start, end, transport=transport)
        daily = payload["daily"]
        times = _series(daily, "time")
        precipitation = _series(daily, "precipitation_sum")
        rain = _series(daily, "rain_sum")
        hours = _series(daily, "precipitation_hours")
        temp_max = _series(daily, "temperature_2m_max")
        temp_min = _series(daily, "temperature_2m_min")
        wind = _series(daily, "wind_speed_10m_max")
        fetched_at = now_iso()

        for index, day in enumerate(times):
            row = db.get(WeatherDaily, day)
            if row is None:
                row = WeatherDaily(date=day)
                db.add(row)
            row.precipitation_sum = _num(_at(precipitation, index))
            row.rain_sum = _num(_at(rain, index))
            row.precipitation_hours = _num(_at(hours, index))
            row.temp_max = _num(_at(temp_max, index))
            row.temp_min = _num(_at(temp_min, index))
            row.wind_max = _num(_at(wind, index))
            row.source = SOURCE_ARCHIVE
            row.fetched_at = fetched_at

        db.flush()
        return len(times), f"{start.isoformat()}..{end.isoformat()} ({len(times)} days)"

    return _execute(db, SOURCE_ARCHIVE, work)


def ingest_forecast(
    db: Session,
    *,
    days: int = 7,
    transport: Any | None = None,
    today: date | None = None,
) -> IngestionRun:
    """Replace the forward-looking daily forecast for Indore."""
    start = today or today_utc()

    def work() -> tuple[int, str]:
        payload = fetch_forecast(days=days, transport=transport)
        daily = payload["daily"]
        times = _series(daily, "time")
        precipitation = _series(daily, "precipitation_sum")
        probability = _series(daily, "precipitation_probability_max")
        hours = _series(daily, "precipitation_hours")
        temp_max = _series(daily, "temperature_2m_max")
        temp_min = _series(daily, "temperature_2m_min")
        wind = _series(daily, "wind_speed_10m_max")
        fetched_at = now_iso()

        # Old forecast days would otherwise linger as if they were current.
        db.execute(delete(WeatherForecast).where(WeatherForecast.date < start.isoformat()))

        for index, day in enumerate(times):
            row = db.get(WeatherForecast, day)
            if row is None:
                row = WeatherForecast(date=day)
                db.add(row)
            row.precipitation_sum = _num(_at(precipitation, index))
            row.precipitation_probability = _int(_at(probability, index))
            row.precipitation_hours = _num(_at(hours, index))
            row.temp_max = _num(_at(temp_max, index))
            row.temp_min = _num(_at(temp_min, index))
            row.wind_max = _num(_at(wind, index))
            row.source = SOURCE_FORECAST
            row.fetched_at = fetched_at

        db.flush()
        return len(times), f"{start.isoformat()} +{len(times)} days"

    return _execute(db, SOURCE_FORECAST, work)


def ingest_weather(
    db: Session,
    *,
    archive_days: int = 30,
    forecast_days: int = 7,
    transport: Any | None = None,
    today: date | None = None,
) -> list[IngestionRun]:
    """Run both weather imports; each gets its own provenance row."""
    return [
        ingest_archive(
            db, days=archive_days, transport=transport, today=today
        ),
        ingest_forecast(
            db, days=forecast_days, transport=transport, today=today
        ),
    ]


def ingest_landuse(
    db: Session,
    *,
    transport: Any | None = None,
) -> IngestionRun:
    """Fetch OSM landuse polygons and store per-cell built-up/green/water shares."""

    def work() -> tuple[int, str]:
        elements = fetch_landuse(transport=transport)
        polygons = prepare_polygons(elements)
        if not polygons:
            raise OverpassError(
                "Overpass returned no usable landuse polygons for the Indore bbox"
            )
        computed = compute_cell_features(grid_cells(), polygons)
        fetched_at = now_iso()
        for cell_id, values in computed.items():
            row = db.get(CellFeature, cell_id)
            if row is None:
                row = CellFeature(cell_id=cell_id)
                db.add(row)
            row.built_up_share = float(values["built_up_share"])
            row.green_share = float(values["green_share"])
            row.water_share = float(values["water_share"])
            row.samples = int(values["samples"])
            row.source = SOURCE_OSM_LANDUSE
            row.fetched_at = fetched_at

        db.flush()
        detail = (
            f"{len(polygons)} polygons from {len(elements)} ways, "
            f"{len(computed)} cells sampled"
        )
        return len(computed), detail

    return _execute(db, SOURCE_OSM_LANDUSE, work)


def _at(values: list[Any], index: int) -> Any:
    return values[index] if index < len(values) else None


def latest_runs(db: Session, limit: int = 20) -> list[IngestionRun]:
    statement = select(IngestionRun).order_by(IngestionRun.started_at.desc()).limit(limit)
    return list(db.scalars(statement))


def latest_success(db: Session, source: str) -> IngestionRun | None:
    statement = (
        select(IngestionRun)
        .where(IngestionRun.source == source, IngestionRun.status == "success")
        .order_by(IngestionRun.started_at.desc())
        .limit(1)
    )
    return db.scalars(statement).first()


def forecast_is_stale(db: Session) -> tuple[bool, str | None]:
    """True when the newest successful forecast is older than the threshold."""
    run = latest_success(db, SOURCE_FORECAST)
    if run is None or not run.finished_at:
        return True, None
    try:
        finished = datetime.fromisoformat(run.finished_at.replace("Z", "+00:00"))
    except ValueError:
        return True, run.finished_at
    age = datetime.now(timezone.utc) - finished
    return age > timedelta(hours=get_settings().forecast_stale_hours), run.finished_at


def ingest_construction(
    db: Session,
    *,
    transport: Any | None = None,
) -> IngestionRun:
    """Replace the OSM construction layer used by the city works page."""

    def work() -> tuple[int, str]:
        sites = fetch_construction(transport=transport)
        db.execute(delete(ConstructionSite))
        fetched_at = now_iso()
        counts: dict[str, int] = {}
        for site in sites:
            counts[site["kind"]] = counts.get(site["kind"], 0) + 1
            db.add(ConstructionSite(fetched_at=fetched_at, **site))
        db.flush()
        summary = ", ".join(f"{kind}:{count}" for kind, count in sorted(counts.items()))
        return len(sites), f"OSM features ({summary or 'none'})"

    return _execute(db, SOURCE_OSM_CONSTRUCTION, work)
