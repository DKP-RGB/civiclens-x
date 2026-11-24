"""Keyless Overpass client for OpenStreetMap landuse polygons.

Overpass is a shared community service: it is slow (30-60 s for Indore) and
occasionally returns 502 when at capacity. Ingestion is therefore a manual CLI
step with one retry against a mirror, never part of API startup.
"""

from __future__ import annotations

import httpx

from app.core.config import get_settings

OVERPASS_ENDPOINTS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
)


class OverpassError(RuntimeError):
    """Raised when every Overpass endpoint fails."""


def landuse_query(bbox: tuple[float, float, float, float]) -> str:
    south, west, north, east = bbox
    return (
        "[out:json][timeout:180];"
        f'way["landuse"]({south},{west},{north},{east});'
        "out geom;"
    )


def fetch_landuse(
    *,
    bbox: tuple[float, float, float, float] | None = None,
    transport: httpx.BaseTransport | None = None,
) -> list[dict]:
    """Return landuse ways with their polygon geometry."""
    settings = get_settings()
    query = landuse_query(bbox or settings.city_bbox_tuple)
    headers = {
        "User-Agent": settings.user_agent,
        "Accept": "application/json",
    }
    errors: list[str] = []

    for endpoint in OVERPASS_ENDPOINTS:
        try:
            with httpx.Client(
                timeout=settings.ingestion_timeout_seconds,
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
        return [element for element in elements if element.get("geometry")]

    raise OverpassError("Overpass landuse failed: " + "; ".join(errors))
