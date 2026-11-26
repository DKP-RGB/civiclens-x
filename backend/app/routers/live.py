"""Read-only live endpoints: current weather and nearby real photographs."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.services.commons import CommonsError, fetch_nearby_photos
from app.services.live_weather import LiveWeatherError, fetch_live_weather

router = APIRouter(tags=["live"])


@router.get("/live/weather")
def live_weather() -> dict:
    try:
        return fetch_live_weather()
    except LiveWeatherError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/media/nearby")
def nearby_photos(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: int = Query(default=2500, ge=300, le=10000),
    limit: int = Query(default=8, ge=1, le=16),
) -> dict:
    try:
        return fetch_nearby_photos(lat, lng, radius, limit)
    except CommonsError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
