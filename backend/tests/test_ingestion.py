"""Ingestion tests against mocked HTTP, never the live public APIs."""

from __future__ import annotations

from datetime import date

import httpx
import pytest
from sqlalchemy import delete, select

from app.geospatial.dataset import grid_cells
from app.ingestion import service
from app.ingestion.open_meteo import IngestionError
from app.models.cell_feature import CellFeature
from app.models.ingestion import IngestionRun
from app.models.weather import WeatherDaily, WeatherForecast

TODAY = date(2026, 11, 20)


def _daily_payload(days: list[str], rain: list[float | None]) -> dict:
    return {
        "daily": {
            "time": days,
            "precipitation_sum": rain,
            "rain_sum": rain,
            "precipitation_probability_max": [None] * len(days),
            "precipitation_hours": [3.0] * len(days),
            "temperature_2m_max": [31.0] * len(days),
            "temperature_2m_min": [18.0] * len(days),
            "wind_speed_10m_max": [12.0] * len(days),
        }
    }


def _weather_transport() -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "archive-api.open-meteo.com":
            assert "2026-11-14" in str(request.url)
            return httpx.Response(
                200, json=_daily_payload(["2026-11-14", "2026-11-15"], [4.2, None])
            )
        if request.url.host == "api.open-meteo.com":
            return httpx.Response(
                200, json=_daily_payload(["2026-11-20", "2026-11-21"], [0.0, 12.5])
            )
        raise AssertionError(f"unexpected host {request.url.host}")

    return httpx.MockTransport(handler)


def _cleanup(db) -> None:
    db.execute(delete(WeatherDaily))
    db.execute(delete(WeatherForecast))
    db.execute(delete(CellFeature))
    db.execute(delete(IngestionRun))
    db.commit()


def test_weather_ingestion_records_runs_and_serves_data(client):
    from app.database.session import SessionLocal

    with SessionLocal() as db:
        try:
            runs = service.ingest_weather(
                db,
                archive_days=2,
                forecast_days=2,
                transport=_weather_transport(),
                today=TODAY,
            )
            assert [run.status for run in runs] == ["success", "success"]
            assert [run.records_written for run in runs] == [2, 2]
            assert runs[0].source == service.SOURCE_ARCHIVE
            assert runs[1].source == service.SOURCE_FORECAST

            daily = client.get("/api/v1/weather/daily?days=10")
            assert daily.status_code == 200
            body = daily.json()
            assert body["city"] == "Indore"
            assert body["provenance"] == "public_dataset"
            assert [day["date"] for day in body["days"]] == ["2026-11-14", "2026-11-15"]
            assert body["days"][0]["precipitationSum"] == 4.2
            assert body["days"][1]["precipitationSum"] is None

            forecast = client.get("/api/v1/weather/forecast")
            assert forecast.status_code == 200
            payload = forecast.json()
            assert [day["date"] for day in payload["days"]] == ["2026-11-20", "2026-11-21"]
            assert payload["stale"] is False
            assert payload["days"][1]["precipitationSum"] == 12.5

            runs_response = client.get("/api/v1/ingestion/runs?limit=10")
            assert runs_response.status_code == 200
            sources = {run["source"] for run in runs_response.json()}
            assert {service.SOURCE_ARCHIVE, service.SOURCE_FORECAST} <= sources
        finally:
            _cleanup(db)


def test_forecast_ingestion_drops_expired_days(client):
    from app.database.session import SessionLocal

    with SessionLocal() as db:
        try:
            db.add(
                WeatherForecast(
                    date="2026-11-01",
                    precipitation_sum=1.0,
                    source=service.SOURCE_FORECAST,
                    fetched_at="2026-11-01T00:00:00.000Z",
                )
            )
            db.commit()
            service.ingest_forecast(
                db, days=2, transport=_weather_transport(), today=TODAY
            )
            dates = [row.date for row in db.scalars(select(WeatherForecast))]
            assert "2026-11-01" not in dates
            assert sorted(dates) == ["2026-11-20", "2026-11-21"]
        finally:
            _cleanup(db)


def test_failed_ingestion_is_recorded(client):
    from app.database.session import SessionLocal

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="service unavailable")

    with SessionLocal() as db:
        try:
            with pytest.raises(IngestionError):
                service.ingest_archive(
                    db,
                    days=3,
                    transport=httpx.MockTransport(handler),
                    today=TODAY,
                )
            runs = service.latest_runs(db, 5)
            assert runs[0].status == "failed"
            assert "503" in (runs[0].detail or "")
            assert runs[0].records_written == 0
        finally:
            _cleanup(db)


def test_landuse_ingestion_builds_cell_features(client):
    from app.database.session import SessionLocal

    cell = grid_cells()[0]
    ring = [
        {"lat": cell["lat"] - 0.02, "lon": cell["lng"] - 0.02},
        {"lat": cell["lat"] - 0.02, "lon": cell["lng"] + 0.02},
        {"lat": cell["lat"] + 0.02, "lon": cell["lng"] + 0.02},
        {"lat": cell["lat"] + 0.02, "lon": cell["lng"] - 0.02},
        {"lat": cell["lat"] - 0.02, "lon": cell["lng"] - 0.02},
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "overpass-api.de"
        assert request.method == "POST"
        return httpx.Response(
            200,
            json={
                "elements": [
                    {"type": "way", "id": 1, "tags": {"landuse": "residential"}, "geometry": ring},
                    {"type": "way", "id": 2, "tags": {"building": "yes"}, "geometry": ring},
                ]
            },
        )

    with SessionLocal() as db:
        try:
            run = service.ingest_landuse(db, transport=httpx.MockTransport(handler))
            assert run.status == "success"
            assert run.records_written > 0

            feature = client.get(f"/api/v1/ingestion/features/{cell['id']}")
            assert feature.status_code == 200
            assert feature.json()["builtUpShare"] == 1.0

            summary = client.get("/api/v1/ingestion/features/summary")
            assert summary.status_code == 200
            body = summary.json()
            assert body["cells"] == run.records_written
            assert 0 < body["cellsWithBuiltUp"] < body["cells"]
            assert body["meanBuiltUpShare"] is not None
            assert body["lastSuccessAt"]

            missing = client.get("/api/v1/ingestion/features/NOPE")
            assert missing.status_code == 404
        finally:
            _cleanup(db)
