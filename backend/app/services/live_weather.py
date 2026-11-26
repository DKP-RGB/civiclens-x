"""Real-time Indore weather and rainfall nowcast from Open-Meteo.

Unlike the stored Phase 4 daily rows, this endpoint asks Open-Meteo for
``current`` conditions plus 15-minute precipitation, so the UI can show what is
happening now. Responses are cached for five minutes to stay polite to a free
community service.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import get_settings
from app.utils import cache
from app.utils.time import now_iso

API_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_SECONDS = 300
CACHE_KEY = "live-weather-indore"

# India has a single fixed offset and no daylight saving, so avoid tzdata.
IST = timezone(timedelta(hours=5, minutes=30), "IST")

CURRENT_FIELDS = (
    "temperature_2m,relative_humidity_2m,precipitation,rain,"
    "weather_code,wind_speed_10m"
)
HOURLY_FIELDS = "precipitation,precipitation_probability"
MINUTELY_FIELDS = "precipitation"


class LiveWeatherError(RuntimeError):
    """Raised when Open-Meteo cannot be read at all."""


def _parse_time(value: str, tz: timezone) -> datetime:
    return datetime.fromisoformat(value).replace(tzinfo=tz)


def _hour_index(times: list[str], now: datetime, tz: timezone) -> int:
    for index, value in enumerate(times):
        if _parse_time(value, tz) + timedelta(hours=1) > now:
            return index
    return 0


def fetch_live_weather(
    *,
    transport: httpx.BaseTransport | None = None,
    use_cache: bool = True,
) -> dict[str, Any]:
    if use_cache:
        cached = cache.get(CACHE_KEY)
        if cached is not None:
            return cached

    settings = get_settings()
    params = {
        "latitude": round(settings.city_lat, 4),
        "longitude": round(settings.city_lng, 4),
        "current": CURRENT_FIELDS,
        "hourly": HOURLY_FIELDS,
        "minutely_15": MINUTELY_FIELDS,
        "forecast_days": 2,
        "timezone": settings.city_timezone,
    }

    try:
        with httpx.Client(
            timeout=12.0,
            transport=transport,
            follow_redirects=True,
            headers={"User-Agent": settings.user_agent},
        ) as client:
            response = client.get(API_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise LiveWeatherError(f"Open-Meteo live read failed: {exc}") from exc

    tz = IST
    now = datetime.now(tz)

    current_raw = payload.get("current") or {}
    hourly = payload.get("hourly") or {}
    minutely = payload.get("minutely_15") or {}

    hourly_times = [str(value) for value in hourly.get("time") or []]
    hourly_rain = [float(value or 0) for value in hourly.get("precipitation") or []]
    hourly_chance = hourly.get("precipitation_probability") or []
    start = _hour_index(hourly_times, now, tz)

    window = hourly_rain[start : start + 24]
    rain_next_3h = round(sum(window[:3]), 2)
    rain_next_24h = round(sum(window[:24]), 2)

    minutely_times = [str(value) for value in minutely.get("time") or []]
    minutely_rain = [float(value or 0) for value in minutely.get("precipitation") or []]
    if minutely_times and minutely_rain:
        first = 0
        for index, value in enumerate(minutely_times):
            if _parse_time(value, tz) + timedelta(minutes=15) > now:
                first = index
                break
        nowcast = minutely_rain[first : first + 4]
        rain_next_1h = round(sum(nowcast), 2) if nowcast else round(window[0] if window else 0, 2)
    else:
        rain_next_1h = round(window[0] if window else 0, 2)

    hours = []
    for offset, value in enumerate(window):
        index = start + offset
        hours.append(
            {
                "time": hourly_times[index] if index < len(hourly_times) else None,
                "precipitation": round(value, 2),
                "probability": (
                    int(hourly_chance[index])
                    if index < len(hourly_chance) and hourly_chance[index] is not None
                    else None
                ),
            }
        )

    result = {
        "city": settings.city_name,
        "timezone": settings.city_timezone,
        "provenance": "public_dataset",
        "source": "open-meteo",
        "fetchedAt": now_iso(),
        "current": {
            "time": current_raw.get("time"),
            "temperature": current_raw.get("temperature_2m"),
            "humidity": current_raw.get("relative_humidity_2m"),
            "precipitation": current_raw.get("precipitation"),
            "rain": current_raw.get("rain"),
            "weatherCode": current_raw.get("weather_code"),
            "wind": current_raw.get("wind_speed_10m"),
        },
        "nowcastMm": {
            "next1h": rain_next_1h,
            "next3h": rain_next_3h,
            "next24h": rain_next_24h,
        },
        "hourly": hours,
        "stale": False,
        "cacheSeconds": CACHE_SECONDS,
    }
    cache.set(CACHE_KEY, result, CACHE_SECONDS)
    return result


def safe_live_weather() -> tuple[dict[str, Any] | None, str | None]:
    """Return (data, error) so a caller can degrade instead of raising."""
    try:
        return fetch_live_weather(), None
    except LiveWeatherError as exc:
        return None, str(exc)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
