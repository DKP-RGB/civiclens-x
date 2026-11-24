"""Turn OSM landuse polygons into per-cell built-up / green / water shares.

A 250 m cell is sampled at nine points (3x3, 80 m apart). Each point is tested
against the landuse polygons and the resulting shares are stored as 0..1
fractions. This is a proxy for impervious cover, not a land-cover raster.
"""

from __future__ import annotations

import math
from typing import Any, Iterable, Literal

LandKind = Literal["built_up", "green", "water"]

# Precedence when polygons overlap: water wins, then built-up, then green.
_PRIORITY: dict[LandKind, int] = {"water": 3, "built_up": 2, "green": 1}

BUILT_UP_TAGS = {
    "residential",
    "commercial",
    "industrial",
    "retail",
    "construction",
    "railway",
    "landfill",
    "quarry",
    "military",
    "depot",
    "port",
    "education",
    "religious",
    "institutional",
}

GREEN_TAGS = {
    "forest",
    "meadow",
    "grass",
    "park",
    "recreation_ground",
    "orchard",
    "vineyard",
    "farmland",
    "farmyard",
    "allotments",
    "village_green",
    "cemetery",
    "plant_nursery",
    "greenhouse_horticulture",
    "flowerbed",
}

WATER_TAGS = {"reservoir", "basin", "salt_pond"}

EARTH_METERS_PER_DEGREE = 111_320.0


def classify_landuse(tag: str | None) -> LandKind | None:
    if not tag:
        return None
    value = tag.strip().lower()
    if value in WATER_TAGS:
        return "water"
    if value in BUILT_UP_TAGS:
        return "built_up"
    if value in GREEN_TAGS:
        return "green"
    return None


def _ring(element: dict[str, Any]) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for node in element.get("geometry") or []:
        lat, lon = node.get("lat"), node.get("lon")
        if lat is None or lon is None:
            continue
        points.append((float(lon), float(lat)))
    return points


def prepare_polygons(elements: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    polygons: list[dict[str, Any]] = []
    for element in elements:
        tags = element.get("tags") or {}
        kind = classify_landuse(tags.get("landuse"))
        if kind is None:
            continue
        ring = _ring(element)
        if len(ring) < 3:
            continue
        xs = [point[0] for point in ring]
        ys = [point[1] for point in ring]
        polygons.append(
            {
                "kind": kind,
                "ring": ring,
                "minx": min(xs),
                "maxx": max(xs),
                "miny": min(ys),
                "maxy": max(ys),
            }
        )
    return polygons


def point_in_ring(x: float, y: float, ring: list[tuple[float, float]]) -> bool:
    """Ray casting on the lng/lat plane; accurate enough at 250 m."""
    inside = False
    count = len(ring)
    j = count - 1
    for i in range(count):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y):
            x_cross = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < x_cross:
                inside = not inside
        j = i
    return inside


def sample_points(
    lat: float,
    lng: float,
    *,
    samples_per_side: int = 3,
    spacing_m: float = 80.0,
) -> list[tuple[float, float]]:
    if samples_per_side <= 1:
        return [(lng, lat)]
    offsets = [
        (index - (samples_per_side - 1) / 2) * spacing_m
        for index in range(samples_per_side)
    ]
    lat_step = 1.0 / EARTH_METERS_PER_DEGREE
    lng_step = lat_step / max(0.1, math.cos(math.radians(lat)))
    return [
        (lng + dx * lng_step, lat + dy * lat_step)
        for dy in offsets
        for dx in offsets
    ]


def compute_cell_features(
    cells: Iterable[dict[str, Any]],
    polygons: list[dict[str, Any]],
    *,
    samples_per_side: int = 3,
    spacing_m: float = 80.0,
) -> dict[str, dict[str, float | int]]:
    features: dict[str, dict[str, float | int]] = {}
    for cell in cells:
        lat = float(cell["lat"])
        lng = float(cell["lng"])
        points = sample_points(
            lat, lng, samples_per_side=samples_per_side, spacing_m=spacing_m
        )
        counts: dict[LandKind, int] = {"built_up": 0, "green": 0, "water": 0}

        # Cheap bbox prefilter around the whole cell before per-point tests.
        pad = (samples_per_side * spacing_m) / EARTH_METERS_PER_DEGREE
        candidates = [
            polygon
            for polygon in polygons
            if polygon["minx"] <= lng + pad
            and polygon["maxx"] >= lng - pad
            and polygon["miny"] <= lat + pad
            and polygon["maxy"] >= lat - pad
        ]

        for x, y in points:
            hits = [
                polygon
                for polygon in candidates
                if polygon["minx"] <= x <= polygon["maxx"]
                and polygon["miny"] <= y <= polygon["maxy"]
                and point_in_ring(x, y, polygon["ring"])
            ]
            if not hits:
                continue
            best = max(hits, key=lambda polygon: _PRIORITY[polygon["kind"]])
            counts[best["kind"]] += 1

        total = len(points)
        features[str(cell["id"])] = {
            "built_up_share": counts["built_up"] / total,
            "green_share": counts["green"] / total,
            "water_share": counts["water"] / total,
            "samples": total,
        }
    return features
