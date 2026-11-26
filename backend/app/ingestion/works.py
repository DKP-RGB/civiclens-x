"""Construction sites mapped in OpenStreetMap.

Every row is a live OSM feature tagged under construction. OSM is crowd-sourced
and may lag reality, and it rarely carries a completion date, so the UI must not
present these as an official municipal work schedule.
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import get_settings
from app.ingestion.overpass import OVERPASS_ENDPOINTS, OverpassError


INDORE_RELATION_ID = 16636427


def construction_query() -> str:
    """Query the OSM Indore boundary area.

    A bbox query times out on the public server; mapping the city relation to an
    area is both smaller and more precise.
    """
    return (
        "[out:json][timeout:120];"
        f"rel({INDORE_RELATION_ID});"
        "map_to_area->.a;"
        'way["highway"="construction"](area.a);'
        'way["landuse"="construction"](area.a);'
        'way["building"="construction"](area.a);'
        'way["man_made"="bridge"]["construction"](area.a);'
        "out tags geom;"
    )


def classify(tags: dict[str, Any]) -> str:
    if tags.get("man_made") == "bridge" or tags.get("bridge") == "yes":
        return "bridge"
    if tags.get("highway") == "construction":
        return "road"
    if tags.get("landuse") == "construction":
        return "site"
    if tags.get("building") == "construction":
        return "building"
    return "other"


def label_for(tags: dict[str, Any]) -> str | None:
    for key in ("name", "ref"):
        value = tags.get(key)
        if value:
            return str(value)[:200]
    work = tags.get("construction")
    if work:
        return f"{work} under construction"[:200]
    return None


def fetch_construction(
    *,
    transport: httpx.BaseTransport | None = None,
) -> list[dict[str, Any]]:
    settings = get_settings()
    query = construction_query()
    headers = {"User-Agent": settings.user_agent, "Accept": "application/json"}
    errors: list[str] = []

    for endpoint in OVERPASS_ENDPOINTS:
        try:
            with httpx.Client(
                timeout=min(settings.ingestion_timeout_seconds, 45.0),
                headers=headers,
                transport=transport,
                follow_redirects=True,
            ) as client:
                response = client.post(endpoint, data={"data": query})
                response.raise_for_status()
                payload = response.json()
        except httpx.HTTPStatusError as exc:
            errors.append(f"{endpoint} -> HTTP {exc.response.status_code}")
            continue
        except (httpx.HTTPError, ValueError) as exc:
            errors.append(f"{endpoint} -> {exc}")
            continue

        elements = payload.get("elements") if isinstance(payload, dict) else None
        if not isinstance(elements, list):
            errors.append(f"{endpoint} -> response without elements")
            continue

        sites: list[dict[str, Any]] = []
        for element in elements:
            geometry = element.get("geometry") or []
            points = [
                (float(point["lat"]), float(point["lon"]))
                for point in geometry
                if "lat" in point and "lon" in point
            ]
            if not points:
                center = element.get("center") or {}
                if "lat" in center and "lon" in center:
                    points = [(float(center["lat"]), float(center["lon"]))]
            if not points:
                continue
            lat = sum(point[0] for point in points) / len(points)
            lng = sum(point[1] for point in points) / len(points)
            tags = element.get("tags") or {}
            sites.append(
                {
                    "osm_id": f"{element.get('type', 'way')}/{element.get('id')}",
                    "kind": classify(tags),
                    "name": label_for(tags),
                    "lat": lat,
                    "lng": lng,
                    "tags": json.dumps(tags, ensure_ascii=True)[:2000],
                }
            )
        if not sites:
            # An empty answer from a busy server must not silently wipe the
            # stored layer, so treat it as a failure and try the next mirror.
            errors.append(f"{endpoint} -> empty result")
            continue
        return sites

    raise OverpassError("Overpass construction failed: " + "; ".join(errors))
