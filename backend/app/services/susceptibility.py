"""Physically-based waterlogging susceptibility surface (v0.2).

This is a different, honest artefact from the Phase 2 prototype scorer:

* inputs are real wherever they exist — DEM-derived TWI, OSM landuse built-up
  share, OSM waterway distance, OSM road density and a live Open-Meteo
  rainfall nowcast;
* the formula is a transparent screening rule, not a trained model;
* it has **not** been calibrated or validated against verified Indore
  waterlogging records, because no such open dataset exists yet.

The output is therefore labelled ``model_output`` with ``trained: false`` and
``validated: false``.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import exp
from typing import Any

from app.geospatial.dataset import grid_cells
from app.services.hydrology import twi_rank
from app.services.risk import clamp, risk_level_from_probability

MODEL_ID = "hydro-screening-0.2"
MODEL_NAME = "Terrain-wetness screening index"

RAIN1_REF = 25.0
RAIN3_REF = 45.0
RAIN24_REF = 120.0


@dataclass(frozen=True)
class RainfallInputs:
    rain1h: float
    rain3h: float
    rain24h: float
    source: str = "demo"


MODEL_CARD = {
    "id": MODEL_ID,
    "name": MODEL_NAME,
    "kind": "physically-based screening index",
    "trained": False,
    "validated": False,
    "note": (
        "Combines DEM-derived topographic wetness, real OSM land-use and waterway "
        "proximity with a live rainfall nowcast. Weights follow standard wetness and "
        "flash-flood screening practice. There are no verified Indore waterlogging "
        "labels, so this model has not been trained, calibrated or validated."
    ),
}


def _rain_factor(inputs: RainfallInputs) -> float:
    intensity = 0.45 * clamp(inputs.rain1h / RAIN1_REF, 0.0, 1.6)
    burst = 0.25 * clamp(inputs.rain3h / RAIN3_REF, 0.0, 1.6)
    accumulation = 0.45 * clamp(inputs.rain24h / RAIN24_REF, 0.0, 1.6)
    return intensity + burst + accumulation


def _score(
    cell: dict[str, Any],
    wetness: float,
    built_up: float,
    rain_factor: float,
) -> float:
    drainage_gap = 1 - clamp(cell["waterDistance"] / 1500, 0.0, 1.0)
    z = (
        -4.9
        + 2.6 * wetness
        + 1.3 * built_up
        + 0.9 * drainage_gap
        + 0.5 * cell["roadDensity"]
        + 2.0 * rain_factor
    )
    return 1 / (1 + exp(-z))


def compute_surface(
    inputs: RainfallInputs,
    built_up: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Score every cell and return a compact, map-ready surface."""
    measured = built_up or {}
    rain_factor = _rain_factor(inputs)
    cells: list[dict[str, Any]] = []
    counts = {"low": 0, "moderate": 0, "high": 0, "critical": 0}
    total = 0.0

    for cell in grid_cells():
        cell_id = cell["id"]
        wetness = twi_rank(cell_id)
        has_landuse = cell_id in measured
        built_up_share = measured[cell_id] if has_landuse else cell["impervious"]
        probability = _score(cell, wetness, built_up_share, rain_factor)
        level = risk_level_from_probability(probability)
        counts[level] += 1
        total += probability
        cells.append(
            {
                "cellId": cell_id,
                "lng": cell["lng"],
                "lat": cell["lat"],
                "localityId": cell["localityId"],
                "probability": round(probability, 4),
                "level": level,
                "wetness": round(wetness, 3),
                "builtUpShare": round(built_up_share, 3),
                "builtUpSource": "osm_landuse" if has_landuse else "simulated_proxy",
                "rainFactor": round(rain_factor, 3),
            }
        )

    cells.sort(key=lambda item: item["probability"], reverse=True)
    return {
        "model": MODEL_CARD,
        "inputs": {
            "rain1h": inputs.rain1h,
            "rain3h": inputs.rain3h,
            "rain24h": inputs.rain24h,
            "source": inputs.source,
        },
        "summary": {
            "meanProbability": round(total / len(cells), 4),
            "counts": counts,
            "criticalCells": counts["critical"],
            "highCells": counts["high"],
            "totalCells": len(cells),
            "cellsWithMeasuredBuiltUp": len(measured),
        },
        "topCells": cells[:12],
        "cells": cells,
    }
