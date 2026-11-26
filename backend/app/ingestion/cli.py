"""Manual ingestion CLI.

Usage (from backend/, with the virtualenv active):

    python -m app.ingestion.cli weather
    python -m app.ingestion.cli weather --archive-days 60 --forecast-days 7
    python -m app.ingestion.cli landuse
    python -m app.ingestion.cli all

Nothing runs on API startup: public endpoints are rate-limited community
services, so imports stay explicit and recorded.
"""

from __future__ import annotations

import argparse
import sys

from app.database.session import SessionLocal, create_all
from app.ingestion import service
from app.models.ingestion import IngestionRun


def _print_run(run: IngestionRun) -> None:
    state = run.status.upper()
    detail = f" - {run.detail}" if run.detail else ""
    print(f"[{state}] {run.source}: {run.records_written} rows{detail}")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Ingest Indore public data")
    parser.add_argument(
        "command",
        choices=["weather", "landuse", "works", "all"],
        help=(
            "weather = archive + forecast, landuse = OSM polygons, "
            "works = OSM construction sites, all = every source"
        ),
    )
    parser.add_argument("--archive-days", type=int, default=30)
    parser.add_argument("--forecast-days", type=int, default=7)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    create_all()

    with SessionLocal() as db:
        try:
            if args.command in {"weather", "all"}:
                for run in service.ingest_weather(
                    db,
                    archive_days=args.archive_days,
                    forecast_days=args.forecast_days,
                ):
                    _print_run(run)
            if args.command in {"landuse", "all"}:
                _print_run(service.ingest_landuse(db))
            if args.command in {"works", "all"}:
                _print_run(service.ingest_construction(db))
        except Exception as exc:  # noqa: BLE001 - CLI boundary
            print(f"Ingestion failed: {exc}", file=sys.stderr)
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
