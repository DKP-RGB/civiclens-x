"""Risk surface API: current scores, single cells and what-if scenarios."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.geospatial.dataset import cell_map
from app.schemas.enums import DrainageCondition, RiskCategory
from app.schemas.risk import (
    CellRiskOut,
    LocalityRiskOut,
    RiskInputsOut,
    RiskResponse,
    RiskSummaryResponse,
    ScenarioOut,
    ScenarioRequest,
    ScenarioResponse,
)
from app.services import risk as service

router = APIRouter(prefix="/risk", tags=["risk"])


def _inputs(
    rain1h: float,
    rain3h: float,
    rain24h: float,
    drainage: DrainageCondition | None,
    impervious: float | None,
) -> service.RiskInputs:
    return service.RiskInputs(
        rain1h=rain1h,
        rain3h=rain3h,
        rain24h=rain24h,
        drainage_multiplier=service.DRAINAGE_MULTIPLIER[drainage] if drainage else None,
        impervious_override=impervious,
    )


@router.get("", response_model=RiskResponse)
def get_risk(
    category: RiskCategory = "waterlogging",
    rain1h: float = Query(default=12, ge=0, le=500),
    rain3h: float = Query(default=30, ge=0, le=800),
    rain24h: float = Query(default=105, ge=0, le=2000),
    drainage: DrainageCondition | None = None,
    impervious: float | None = Query(default=None, ge=0, le=1),
) -> RiskResponse:
    inputs = _inputs(rain1h, rain3h, rain24h, drainage, impervious)
    risks = service.compute_city_risks(category, inputs)
    return RiskResponse(
        category=category,
        inputs=RiskInputsOut(rain1h=rain1h, rain3h=rain3h, rain24h=rain24h),
        summary=service.summarize_risks(risks),
        cells=risks,
    )


@router.get("/summary", response_model=RiskSummaryResponse)
def get_summary(
    category: RiskCategory = "waterlogging",
    rain1h: float = Query(default=12, ge=0, le=500),
    rain3h: float = Query(default=30, ge=0, le=800),
    rain24h: float = Query(default=105, ge=0, le=2000),
) -> RiskSummaryResponse:
    inputs = _inputs(rain1h, rain3h, rain24h, None, None)
    risks = service.compute_city_risks(category, inputs)
    return RiskSummaryResponse(
        category=category,
        inputs=RiskInputsOut(rain1h=rain1h, rain3h=rain3h, rain24h=rain24h),
        summary=service.summarize_risks(risks),
        top_cells=service.get_top_risk_cells(risks, 10),
    )


@router.get("/cells/{cell_id}", response_model=CellRiskOut)
def get_cell_risk(
    cell_id: str,
    category: RiskCategory = "waterlogging",
) -> CellRiskOut:
    cell = cell_map().get(cell_id)
    if cell is None:
        raise HTTPException(status_code=404, detail="Grid cell not found")
    return CellRiskOut.model_validate(
        service.compute_cell_risk(cell, category, service.DEMO_RISK_INPUTS)
    )


@router.post("/simulate", response_model=ScenarioResponse)
def simulate(payload: ScenarioRequest) -> ScenarioResponse:
    baseline = service.compute_city_risks(payload.category, service.DEMO_RISK_INPUTS)
    scenario = service.simulate_scenario(
        payload.category,
        baseline,
        payload.rainfall_mm_per_hour,
        payload.rainfall_duration_hours,
        payload.drainage_condition,
        payload.impervious_pct,
    )
    localities: list[LocalityRiskOut] = [
        LocalityRiskOut.model_validate(item)
        for item in service.get_locality_risk_summaries(scenario)
    ]
    return ScenarioResponse(
        scenario=ScenarioOut(
            category=payload.category,
            rainfall_mm_per_hour=payload.rainfall_mm_per_hour,
            rainfall_duration_hours=payload.rainfall_duration_hours,
            drainage_condition=payload.drainage_condition,
            impervious_pct=payload.impervious_pct,
            total_rainfall_mm=payload.rainfall_mm_per_hour * payload.rainfall_duration_hours,
        ),
        baseline_summary=service.summarize_risks(baseline),
        scenario_summary=service.summarize_risks(scenario),
        localities=localities,
        cells=scenario,
    )
