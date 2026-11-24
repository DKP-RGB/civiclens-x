"""Keyless Open-Meteo clients for Indore rainfall.

Docs: https://open-meteo.com/en/docs (archive + forecast). No API key is needed
for non-commercial use. Requests are intentionally small: one city point and a
handful of daily variables.
"""

from __future__ import annotations

from datetime import date

import httpx

from app.core.config import get_settings

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

ARCHIVE_VARIABLES = (
    "precipitation_sum,rain_sum,precipitation_hours,"
    "temperature_2m_max,temperature_2m_min,wind_speed_10m_max"
)
FORECAST_VARIABLES = (
    "precipitation_sum,precipitation_probability_max,precipitation_hours,"
    "temperature_2m_max,temperature_2m_min,wind_speed_10m_max"
)


class IngestionError(RuntimeError):
    """Raised when a public data source cannot be read or parsed."""


def _get_json(url: str, params: dict[str, object], *, transport: httpx.BaseTransport | None) -> dict:
    settings = get_settings()
    headers = {"User-Agent": settings.user_agent, "Accept": "application/json"}
    try:
        with httpx.Client(
            timeout=settings.ingestion_timeout_seconds,
            headers=headers,
            transport=transport,
            follow_redirects=True,
        ) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPStatusError as exc:
        raise IngestionError(
            f"Open-Meteo returned HTTP {exc.response.status_code}: {exc.response.text[:200]}"
        ) from exc
    except httpx.HTTPError as exc:
        raise IngestionError(f"Open-Meteo request failed: {exc}") from exc
    except ValueError as exc:
        raise IngestionError("Open-Meteo returned a non-JSON body") from exc

    if not isinstance(payload, dict) or "daily" not in payload:
        raise IngestionError("Open-Meteo response is missing the daily block")
    return payload


def fetch_archive(
    start_date: date,
    end_date: date,
    *,
    transport: httpx.BaseTransport | None = None,
) -> dict:
    """Daily reanalysis for a closed date range (archive lags ~5 days)."""
    settings = get_settings()
    params = {
        "latitude": settings.city_lat,
        "longitude": settings.city_lng,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "daily": ARCHIVE_VARIABLES,
        "timezone": settings.city_timezone,
    }
    return _get_json(ARCHIVE_URL, params, transport=transport)


def fetch_forecast(
    *,
    days: int = 7,
    transport: httpx.BaseTransport | None = None,
) -> dict:
    """Daily forecast starting today, in Indore local time."""
    settings = get_settings()
    params = {
        "latitude": settings.city_lat,
        "longitude": settings.city_lng,
        "daily": FORECAST_VARIABLES,
        "forecast_days": max(1, min(days, 16)),
        "timezone": settings.city_timezone,
    }
    return _get_json(FORECAST_URL, params, transport=transport)
