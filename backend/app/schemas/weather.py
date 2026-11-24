"""Weather and ingestion schemas."""

from __future__ import annotations

from typing import Literal

from app.schemas.common import CamelModel


class DailyWeatherOut(CamelModel):
    date: str
    precipitation_sum: float | None = None
    rain_sum: float | None = None
    precipitation_probability: int | None = None
    precipitation_hours: float | None = None
    temp_max: float | None = None
    temp_min: float | None = None
    wind_max: float | None = None
    source: str
    fetched_at: str


class WeatherResponse(CamelModel):
    city: str
    timezone: str
    provenance: Literal["public_dataset"] = "public_dataset"
    days: list[DailyWeatherOut]


class ForecastResponse(WeatherResponse):
    stale: bool
    stale_hours: int
    last_success_at: str | None = None


class IngestionRunOut(CamelModel):
    id: str
    source: str
    status: Literal["running", "success", "failed"]
    started_at: str
    finished_at: str | None = None
    records_written: int
    detail: str | None = None


class CellFeatureOut(CamelModel):
    cell_id: str
    built_up_share: float
    green_share: float
    water_share: float
    samples: int
    source: str
    fetched_at: str


class FeatureSummaryOut(CamelModel):
    cells: int
    mean_built_up_share: float | None = None
    mean_green_share: float | None = None
    mean_water_share: float | None = None
    samples_per_cell: int | None = None
    source: str | None = None
    fetched_at: str | None = None
    last_success_at: str | None = None
