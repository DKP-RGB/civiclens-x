"""Major Indore works compiled from public sources.

Only projects with a citable public source are listed. ``expectedCompletion``
stays ``null`` unless a source states a date: guessing a completion date would
be exactly the kind of invented detail this project refuses to show.
"""

from __future__ import annotations

from typing import Any

from app.geospatial.dataset import _load  # shared JSON loader


def city_projects() -> list[dict[str, Any]]:
    return _load("city-projects.json")["projects"]


def city_projects_meta() -> dict[str, Any]:
    data = _load("city-projects.json")
    return {key: value for key, value in data.items() if key != "projects"}
