"""Weather API: ingested observations and the forward forecast."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database.session import get_db
from app.ingestion.service import forecast_is_stale
from app.models.weather import WeatherDaily, WeatherForecast
from app.schemas.weather import DailyWeatherOut, ForecastResponse, WeatherResponse

router = APIRouter(prefix="/weather", tags=["weather"])

settings = get_settings()


@router.get("/daily", response_model=WeatherResponse)
def get_daily_weather(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
) -> WeatherResponse:
    """Most recent observed days, returned oldest-first for charting."""
    rows = list(
        db.scalars(
            select(WeatherDaily)
            .order_by(WeatherDaily.date.desc())
            .limit(days)
        )
    )
    rows.reverse()
    return WeatherResponse(
        city=settings.city_name,
        timezone=settings.city_timezone,
        days=[DailyWeatherOut.model_validate(row) for row in rows],
    )


@router.get("/forecast", response_model=ForecastResponse)
def get_forecast(db: Session = Depends(get_db)) -> ForecastResponse:
    """Forward daily forecast. Empty until the ingestion CLI has been run."""
    rows = list(
        db.scalars(select(WeatherForecast).order_by(WeatherForecast.date.asc()))
    )
    stale, last_success = forecast_is_stale(db)
    return ForecastResponse(
        city=settings.city_name,
        timezone=settings.city_timezone,
        days=[DailyWeatherOut.model_validate(row) for row in rows],
        stale=stale,
        stale_hours=settings.forecast_stale_hours,
        last_success_at=last_success,
    )
