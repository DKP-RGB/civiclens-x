"""Observed and forecast rainfall ingested from Open-Meteo.

Both tables are keyed by local calendar date (Asia/Kolkata) because the
frontend, the risk horizons and the source API all reason in local days.
Values are stored exactly as reported; missing readings stay NULL rather than
being filled with zeros.
"""

from __future__ import annotations

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class WeatherDaily(Base):
    """Historical daily weather for Indore (Open-Meteo archive)."""

    __tablename__ = "weather_daily"

    date: Mapped[str] = mapped_column(String(10), primary_key=True)
    precipitation_sum: Mapped[float | None] = mapped_column(Float, nullable=True)
    rain_sum: Mapped[float | None] = mapped_column(Float, nullable=True)
    precipitation_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    temp_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    temp_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_max: Mapped[float | None] = mapped_column(Float, nullable=True)

    source: Mapped[str] = mapped_column(String(40))
    fetched_at: Mapped[str] = mapped_column(String(40))


class WeatherForecast(Base):
    """Forward-looking daily weather for Indore (Open-Meteo forecast)."""

    __tablename__ = "weather_forecast"

    date: Mapped[str] = mapped_column(String(10), primary_key=True)
    precipitation_sum: Mapped[float | None] = mapped_column(Float, nullable=True)
    precipitation_probability: Mapped[int | None] = mapped_column(Integer, nullable=True)
    precipitation_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    temp_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    temp_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_max: Mapped[float | None] = mapped_column(Float, nullable=True)

    source: Mapped[str] = mapped_column(String(40))
    fetched_at: Mapped[str] = mapped_column(String(40))
