"""Load the generated Indore datasets bundled with the backend."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


@lru_cache
def _load(name: str) -> Any:
    path = DATA_DIR / name
    return json.loads(path.read_text(encoding="utf-8"))


def grid_cells() -> list[dict[str, Any]]:
    return _load("indore-grid.json")


def grid_meta() -> dict[str, Any]:
    return _load("grid-meta.json")


def localities() -> list[dict[str, Any]]:
    return _load("localities.json")


def incidents() -> list[dict[str, Any]]:
    return _load("incidents.json")


@lru_cache
def locality_map() -> dict[str, dict[str, Any]]:
    return {item["id"]: item for item in localities()}


@lru_cache
def cell_map() -> dict[str, dict[str, Any]]:
    return {item["id"]: item for item in grid_cells()}


@lru_cache
def elevation_range() -> tuple[float, float]:
    elevations = [cell["elevation"] for cell in grid_cells()]
    return min(elevations), max(elevations)


def complaint_seeds() -> list[dict[str, Any]]:
    return _load("complaints.seed.json")
