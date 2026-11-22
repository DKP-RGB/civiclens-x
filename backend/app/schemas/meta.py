"""Metadata schemas: model card, dataset provenance and grid info."""

from __future__ import annotations

from typing import Literal

from app.schemas.common import CamelModel
from app.schemas.risk import GridCellOut, LocalityOut


class DataSourceOut(CamelModel):
    label: str
    provenance: Literal["verified", "public_dataset", "simulated", "model_output"]
    note: str


class ModelMetricsOut(CamelModel):
    precision: float | None = None
    recall: float | None = None
    f1: float | None = None
    pr_auc: float | None = None


class ModelInfoOut(CamelModel):
    name: str
    version: str
    algorithm: str
    status: str
    horizon_hours: int
    trained_at: str | None = None
    metrics: ModelMetricsOut
    data_sources: list[DataSourceOut]
    disclaimer: str


class GridMetaOut(CamelModel):
    city: str
    cell_size_meters: int
    total_cells: int
    elevation_source: str
    boundary_source: str
    road_source: str
    water_source: str
    built_up_note: str
    generated_at: str


class GridResponse(CamelModel):
    meta: GridMetaOut
    cells: list[GridCellOut]


class IncidentOut(CamelModel):
    id: str
    category: str
    lng: float
    lat: float
    locality_id: str
    occurred_at: str
    severity: str
    status: str
    source: str


class MetaResponse(CamelModel):
    app: str
    phase: str
    city: str
    grid: GridMetaOut
    model: ModelInfoOut
    localities: list[LocalityOut]
    provenance: list[DataSourceOut]
    disclaimers: list[str]
