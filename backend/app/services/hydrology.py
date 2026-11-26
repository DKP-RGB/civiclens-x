"""Terrain wetness from the real Copernicus DEM grid.

Builds a D8 flow direction and flow accumulation over the bundled 250 m Indore
grid and derives the topographic wetness index

    TWI = ln(a / tan beta)

where ``a`` is upslope contributing area and ``beta`` is slope. TWI is a
standard, published terrain-analysis method for identifying wet, poorly drained
ground. It is a physical descriptor, not a trained model.
"""

from __future__ import annotations

from functools import lru_cache
from math import log, radians, tan
from typing import Any

from app.geospatial.dataset import grid_cells

CELL_SIZE_M = 250.0
DIAGONAL_M = CELL_SIZE_M * 2**0.5
MIN_SLOPE_DEG = 0.2
PRECISION = 6

CellKey = tuple[int, int]


@lru_cache(maxsize=1)
def terrain() -> dict[str, dict[str, float]]:
    """Return ``{cell_id: {twi, upslopeCells, slope}}`` for the whole grid."""
    cells = grid_cells()
    lats = sorted({round(cell["lat"], PRECISION) for cell in cells})
    lngs = sorted({round(cell["lng"], PRECISION) for cell in cells})
    row_of = {value: index for index, value in enumerate(lats)}
    col_of = {value: index for index, value in enumerate(lngs)}

    at: dict[CellKey, dict[str, Any]] = {}
    for cell in cells:
        key = (
            row_of[round(cell["lat"], PRECISION)],
            col_of[round(cell["lng"], PRECISION)],
        )
        at[key] = cell

    downstream: dict[CellKey, CellKey | None] = {}
    for (row, col), cell in at.items():
        best: CellKey | None = None
        best_gradient = 0.0
        for d_row in (-1, 0, 1):
            for d_col in (-1, 0, 1):
                if d_row == 0 and d_col == 0:
                    continue
                neighbour = at.get((row + d_row, col + d_col))
                if neighbour is None:
                    continue
                distance = DIAGONAL_M if (d_row and d_col) else CELL_SIZE_M
                gradient = (cell["elevation"] - neighbour["elevation"]) / distance
                if gradient > best_gradient:
                    best_gradient = gradient
                    best = (row + d_row, col + d_col)
        downstream[(row, col)] = best

    # Cells with no lower neighbour are sinks; they keep all upstream area.
    accumulation = {key: 1.0 for key in at}
    for key in sorted(at, key=lambda item: at[item]["elevation"], reverse=True):
        target = downstream[key]
        if target is not None:
            accumulation[target] += accumulation[key]

    result: dict[str, dict[str, float]] = {}
    for key, cell in at.items():
        slope = max(float(cell["slope"]), MIN_SLOPE_DEG)
        upslope_area = accumulation[key] * CELL_SIZE_M
        twi = log(upslope_area / tan(radians(slope)))
        result[cell["id"]] = {
            "twi": round(twi, 3),
            "upslopeCells": round(accumulation[key]),
            "slope": float(cell["slope"]),
        }
    return result


@lru_cache(maxsize=1)
def twi_ranges() -> tuple[float, float]:
    values = [item["twi"] for item in terrain().values()]
    return min(values), max(values)


def twi_rank(cell_id: str) -> float:
    """Min-max normalised TWI in 0..1 (higher = wetter, flatter, downstream)."""
    item = terrain().get(cell_id)
    if item is None:
        return 0.0
    low, high = twi_ranges()
    if high <= low:
        return 0.0
    return (item["twi"] - low) / (high - low)
