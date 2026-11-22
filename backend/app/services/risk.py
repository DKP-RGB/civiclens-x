"""Python port of the frontend illustrative risk scorer.

This is NOT a trained ML model. It is the same transparent logistic scoring
rule used by the Phase 2 frontend, ported so the API can serve identical scores
and explanations. Phase 5 replaces this module behind the same response shape.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import exp
from typing import Any

from app.geospatial.dataset import elevation_range, grid_cells, locality_map, localities
from app.schemas.enums import DrainageCondition, RiskCategory, RiskLevel

RAIN1_REF = 25.0
RAIN3_REF = 45.0
RAIN24_REF = 120.0
HIST_REF = 10.0
HIST_ROAD_REF = 8.0

DRAINAGE_MULTIPLIER: dict[DrainageCondition, float] = {
    "poor": 0.55,
    "fair": 1.0,
    "good": 1.3,
}


@dataclass(frozen=True)
class RiskInputs:
    rain1h: float
    rain3h: float
    rain24h: float
    drainage_multiplier: float | None = None
    impervious_override: float | None = None


DEMO_RISK_INPUTS = RiskInputs(rain1h=12, rain3h=30, rain24h=105)


def clamp(value: float, minimum: float, maximum: float) -> float:
    return min(maximum, max(minimum, value))


def risk_level_from_probability(probability: float) -> RiskLevel:
    if probability >= 0.7:
        return "critical"
    if probability >= 0.5:
        return "high"
    if probability >= 0.25:
        return "moderate"
    return "low"


def _elevation_norm(cell: dict[str, Any]) -> float:
    low, high = elevation_range()
    return clamp((cell["elevation"] - low) / (high - low), 0.0, 1.0)


def _drainage_score(cell: dict[str, Any], multiplier: float = 1.0) -> float:
    return clamp((1 - cell["waterDistance"] / 1500) * multiplier, 0.0, 1.2)


def _rain_norms(inputs: RiskInputs) -> dict[str, float]:
    return {
        "rain1": clamp(inputs.rain1h / RAIN1_REF, 0.0, 1.6),
        "rain3": clamp(inputs.rain3h / RAIN3_REF, 0.0, 1.6),
        "rain24": clamp(inputs.rain24h / RAIN24_REF, 0.0, 1.6),
    }


def _finalize_factors(drafts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    positives = sorted(
        (f for f in drafts if f["direction"] == "increases" and f["value"] > 0.01),
        key=lambda f: f["value"],
        reverse=True,
    )[:4]
    reducing = sorted(
        (f for f in drafts if f["direction"] == "reduces" and f["value"] > 0.12),
        key=lambda f: f["value"],
        reverse=True,
    )[:1]
    selected = positives + reducing
    total = sum(abs(f["value"]) for f in selected) or 1.0
    return [
        {
            "key": f["key"],
            "label": f["label"],
            "detail": f["detail"],
            "direction": f["direction"],
            "contribution": round(abs(f["value"]) / total, 3),
        }
        for f in selected
    ]


def _waterlogging_factors(
    cell: dict[str, Any], locality: dict[str, Any], inputs: RiskInputs
) -> tuple[list[dict[str, Any]], float, float]:
    elev = _elevation_norm(cell)
    low_elev = 1 - elev
    flatness = 1 - clamp(cell["slope"] / 6, 0.0, 1.0)
    drainage = _drainage_score(cell, inputs.drainage_multiplier or 1.0)
    impervious = (
        inputs.impervious_override
        if inputs.impervious_override is not None
        else cell["impervious"]
    )
    history = clamp(cell["histWaterlogging"] / HIST_REF, 0.0, 1.0)
    rain = _rain_norms(inputs)
    locality_bias = locality["baseSusceptibility"] - 0.5

    z = (
        -5.35
        + 1.2 * rain["rain24"]
        + 0.5 * rain["rain3"]
        + 0.3 * rain["rain1"]
        + 2.6 * low_elev
        + 0.3 * flatness
        + 0.55 * (1 - drainage)
        + 0.7 * impervious
        + 0.3 * cell["roadDensity"]
        + 1.0 * history
        + 1.0 * locality_bias
    )
    probability = 1 / (1 + exp(-z))

    drafts = [
        {
            "key": "rain24",
            "label": "24 h forecast rainfall",
            "detail": f"{inputs.rain24h:.0f} mm expected",
            "value": 1.2 * rain["rain24"],
            "direction": "increases",
        },
        {
            "key": "rain3",
            "label": "3 h rainfall peak",
            "detail": f"{inputs.rain3h:.0f} mm in the wettest 3 h",
            "value": 0.5 * rain["rain3"],
            "direction": "increases",
        },
        {
            "key": "rain1",
            "label": "1 h rainfall intensity",
            "detail": f"{inputs.rain1h:.0f} mm/h peak",
            "value": 0.3 * rain["rain1"],
            "direction": "increases",
        },
        {
            "key": "elevation",
            "label": "Low elevation",
            "detail": f"{cell['elevation']:.0f} m · lower ground",
            "value": 2.6 * low_elev,
            "direction": "increases",
        },
        {
            "key": "slope",
            "label": "Flat terrain",
            "detail": f"{cell['slope']:.1f}° slope slows runoff",
            "value": 0.3 * flatness,
            "direction": "increases",
        },
        {
            "key": "drainage",
            "label": "Drainage gap",
            "detail": f"{cell['waterDistance']} m to mapped waterway",
            "value": 0.55 * (1 - drainage),
            "direction": "increases",
        },
        {
            "key": "impervious",
            "label": "Built-up surface",
            "detail": f"{impervious * 100:.0f}% impervious proxy",
            "value": 0.7 * impervious,
            "direction": "increases",
        },
        {
            "key": "roads",
            "label": "Road density",
            "detail": f"{cell['roadDensity'] * 100:.0f}% of cell maximum",
            "value": 0.3 * cell["roadDensity"],
            "direction": "increases",
        },
        {
            "key": "history",
            "label": "Recent incident history",
            "detail": f"{cell['histWaterlogging']} waterlogging/drainage reports within 750 m",
            "value": 1.0 * history,
            "direction": "increases",
        },
        {
            "key": "locality",
            "label": "Locality susceptibility",
            "detail": f"{locality['name']} baseline weight",
            "value": 1.0 * max(0.0, locality_bias),
            "direction": "increases",
        },
        {
            "key": "elevation_ok",
            "label": "Higher elevation",
            "detail": f"{cell['elevation']:.0f} m reduces exposure",
            "value": 2.6 * elev,
            "direction": "reduces",
        },
        {
            "key": "drainage_ok",
            "label": "Mapped drainage proximity",
            "detail": f"{cell['waterDistance']} m from a mapped waterway",
            "value": 0.55 * drainage,
            "direction": "reduces",
        },
    ]

    uncertainty = clamp(
        0.06 + 0.16 * (1 - cell["dataCompleteness"]) + 0.05 * (1 - history),
        0.05,
        0.24,
    )
    return _finalize_factors(drafts), probability, uncertainty


def _road_factors(
    cell: dict[str, Any], locality: dict[str, Any], inputs: RiskInputs
) -> tuple[list[dict[str, Any]], float, float]:
    drainage = _drainage_score(cell, inputs.drainage_multiplier or 1.0)
    impervious = (
        inputs.impervious_override
        if inputs.impervious_override is not None
        else cell["impervious"]
    )
    history = clamp(cell["histRoadDamage"] / HIST_ROAD_REF, 0.0, 1.0)
    rain = _rain_norms(inputs)
    slope = clamp(cell["slope"] / 6, 0.0, 1.0)
    locality_bias = locality["baseSusceptibility"] - 0.5

    z = (
        -2.6
        + 1.0 * cell["roadDensity"]
        + 0.9 * impervious
        + 0.75 * (1 - drainage)
        + 0.6 * rain["rain24"]
        + 0.4 * slope
        + 0.9 * history
        + 0.8 * locality_bias
    )
    probability = 1 / (1 + exp(-z))

    drafts = [
        {
            "key": "roads",
            "label": "Road density",
            "detail": f"{cell['roadDensity'] * 100:.0f}% of cell maximum",
            "value": 1.0 * cell["roadDensity"],
            "direction": "increases",
        },
        {
            "key": "impervious",
            "label": "Built-up surface",
            "detail": f"{impervious * 100:.0f}% impervious proxy",
            "value": 0.9 * impervious,
            "direction": "increases",
        },
        {
            "key": "drainage",
            "label": "Drainage gap",
            "detail": f"{cell['waterDistance']} m to mapped waterway",
            "value": 0.75 * (1 - drainage),
            "direction": "increases",
        },
        {
            "key": "rain",
            "label": "Wetting load",
            "detail": f"{inputs.rain24h:.0f} mm forecast in 24 h",
            "value": 0.6 * rain["rain24"],
            "direction": "increases",
        },
        {
            "key": "slope",
            "label": "Gradient stress",
            "detail": f"{cell['slope']:.1f}° slope",
            "value": 0.4 * slope,
            "direction": "increases",
        },
        {
            "key": "history",
            "label": "Pothole & damage history",
            "detail": f"{cell['histRoadDamage']} road damage reports within 750 m",
            "value": 0.9 * history,
            "direction": "increases",
        },
        {
            "key": "locality",
            "label": "Locality road pressure",
            "detail": f"{locality['name']} baseline weight",
            "value": 0.8 * max(0.0, locality_bias),
            "direction": "increases",
        },
        {
            "key": "drainage_ok",
            "label": "Mapped drainage proximity",
            "detail": f"{cell['waterDistance']} m from a mapped waterway",
            "value": 0.75 * drainage,
            "direction": "reduces",
        },
    ]

    return (
        _finalize_factors(drafts),
        probability,
        clamp(0.07 + 0.18 * (1 - cell["dataCompleteness"]), 0.06, 0.25),
    )


def compute_cell_risk(
    cell: dict[str, Any], category: RiskCategory, inputs: RiskInputs
) -> dict[str, Any]:
    locality = locality_map().get(cell["localityId"]) or localities()[0]
    if category == "waterlogging":
        factors, probability, uncertainty = _waterlogging_factors(cell, locality, inputs)
    else:
        factors, probability, uncertainty = _road_factors(cell, locality, inputs)

    return {
        "cell": cell,
        "category": category,
        "probability": round(probability, 4),
        "level": risk_level_from_probability(probability),
        "factors": factors,
        "uncertainty": round(uncertainty, 2),
        "dataCompleteness": cell["dataCompleteness"],
    }


def compute_city_risks(category: RiskCategory, inputs: RiskInputs) -> list[dict[str, Any]]:
    return [compute_cell_risk(cell, category, inputs) for cell in grid_cells()]


def summarize_risks(risks: list[dict[str, Any]]) -> dict[str, Any]:
    counts: dict[str, int] = {"low": 0, "moderate": 0, "high": 0, "critical": 0}
    total = 0.0
    for risk in risks:
        counts[risk["level"]] += 1
        total += risk["probability"]
    return {
        "meanProbability": total / len(risks) if risks else 0.0,
        "counts": counts,
        "criticalCells": counts["critical"],
        "highCells": counts["high"],
        "totalCells": len(risks),
    }


def get_locality_risk_summaries(risks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for risk in risks:
        groups.setdefault(risk["cell"]["localityId"], []).append(risk)

    summaries = []
    for locality_id, cells in groups.items():
        locality = locality_map().get(locality_id)
        if locality is None:
            continue
        mean = sum(cell["probability"] for cell in cells) / len(cells)
        top_cell = max(cells, key=lambda cell: cell["probability"])
        summaries.append(
            {
                "locality": locality,
                "meanProbability": mean,
                "maxProbability": top_cell["probability"],
                "level": risk_level_from_probability(mean),
                "cellCount": len(cells),
                "topCell": top_cell,
            }
        )
    return sorted(summaries, key=lambda item: item["meanProbability"], reverse=True)


def get_top_risk_cells(risks: list[dict[str, Any]], count: int = 8) -> list[dict[str, Any]]:
    return sorted(risks, key=lambda risk: risk["probability"], reverse=True)[:count]


def _haversine_meters(a: dict[str, float], b: dict[str, float]) -> float:
    from math import asin, cos, radians, sin, sqrt

    radius = 6_371_000
    d_lat = radians(b["lat"] - a["lat"])
    d_lng = radians(b["lng"] - a["lng"])
    lat1 = radians(a["lat"])
    lat2 = radians(b["lat"])
    h = sin(d_lat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(d_lng / 2) ** 2
    return 2 * radius * asin(sqrt(h))


def get_nearest_cell(lng: float, lat: float) -> tuple[dict[str, Any], int]:
    point = {"lng": lng, "lat": lat}
    best = grid_cells()[0]
    best_distance = float("inf")
    for cell in grid_cells():
        distance = _haversine_meters(point, cell)
        if distance < best_distance:
            best_distance = distance
            best = cell
    return best, round(best_distance)


def get_nearest_locality(lng: float, lat: float) -> tuple[dict[str, Any], int]:
    point = {"lng": lng, "lat": lat}
    best = localities()[0]
    best_distance = float("inf")
    for locality in localities():
        distance = _haversine_meters(point, locality["centroid"])
        if distance < best_distance:
            best_distance = distance
            best = locality
    return best, round(best_distance)


def simulate_scenario(
    category: RiskCategory,
    base_risks: list[dict[str, Any]],
    rainfall_mm_per_hour: float,
    rainfall_duration_hours: float,
    drainage_condition: DrainageCondition,
    impervious_pct: float,
) -> list[dict[str, Any]]:
    duration = max(1.0, rainfall_duration_hours)
    inputs = RiskInputs(
        rain1h=rainfall_mm_per_hour,
        rain3h=rainfall_mm_per_hour * min(3.0, duration),
        rain24h=rainfall_mm_per_hour * min(24.0, duration),
        drainage_multiplier=DRAINAGE_MULTIPLIER[drainage_condition],
        impervious_override=impervious_pct / 100,
    )
    return [compute_cell_risk(risk["cell"], category, inputs) for risk in base_risks]
