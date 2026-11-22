"""Risk surface request and response schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.enums import DrainageCondition, RiskCategory, RiskLevel


class LatLng(CamelModel):
    lng: float
    lat: float


class GridCellOut(CamelModel):
    id: str
    lng: float
    lat: float
    locality_id: str
    elevation: float
    slope: float
    water_distance: int
    road_density: float
    impervious: float
    hist_waterlogging: int
    hist_road_damage: int
    data_completeness: float


class RiskFactorOut(CamelModel):
    key: str
    label: str
    detail: str
    direction: Literal["increases", "reduces"]
    contribution: float


class CellRiskOut(CamelModel):
    cell: GridCellOut
    category: RiskCategory
    probability: float
    level: RiskLevel
    factors: list[RiskFactorOut]
    uncertainty: float
    data_completeness: float


class RiskCountsOut(CamelModel):
    low: int
    moderate: int
    high: int
    critical: int


class RiskSummaryOut(CamelModel):
    mean_probability: float
    counts: RiskCountsOut
    critical_cells: int
    high_cells: int
    total_cells: int


class RiskInputsOut(CamelModel):
    rain1h: float
    rain3h: float
    rain24h: float


class RiskResponse(CamelModel):
    category: RiskCategory
    inputs: RiskInputsOut
    summary: RiskSummaryOut
    cells: list[CellRiskOut]


class LocalityOut(CamelModel):
    id: str
    name: str
    centroid: LatLng
    coordinates_note: str
    description: str
    base_susceptibility: float
    population_estimate: int


class LocalityRiskOut(CamelModel):
    locality: LocalityOut
    mean_probability: float
    max_probability: float
    level: RiskLevel
    cell_count: int
    top_cell: CellRiskOut


class ScenarioRequest(CamelModel):
    category: RiskCategory = "waterlogging"
    rainfall_mm_per_hour: float = Field(default=18, ge=1, le=120)
    rainfall_duration_hours: float = Field(default=8, ge=1, le=48)
    drainage_condition: DrainageCondition = "fair"
    impervious_pct: float = Field(default=72, ge=0, le=100)


class ScenarioOut(CamelModel):
    category: RiskCategory
    rainfall_mm_per_hour: float
    rainfall_duration_hours: float
    drainage_condition: DrainageCondition
    impervious_pct: float
    total_rainfall_mm: float


class ScenarioResponse(CamelModel):
    scenario: ScenarioOut
    baseline_summary: RiskSummaryOut
    scenario_summary: RiskSummaryOut
    localities: list[LocalityRiskOut]
    cells: list[CellRiskOut]


class RiskSummaryResponse(CamelModel):
    category: RiskCategory
    inputs: RiskInputsOut
    summary: RiskSummaryOut
    top_cells: list[CellRiskOut]
