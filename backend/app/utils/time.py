"""Time helpers shared by services and ingestion runs."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone


def now_iso() -> str:
    """Current UTC time as an ISO-8601 string with a trailing Z."""
    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def today_utc() -> date:
    return datetime.now(timezone.utc).date()


def days_ago(days: int) -> date:
    return today_utc() - timedelta(days=days)
