"""Real, licensed photographs near a point, from Wikimedia Commons.

Commons has a keyless geosearch API. We return the image, its licence and its
author so the UI can attribute every photo. These are photographs taken near a
locality, not a verified photo of a specific pothole: Commons simply has no
geotagged Indore waterlogging or pothole archive, and inventing one would be a
lie.

Geosearch returns whatever happens to be geotagged nearby, which can include
flowers or food. Titles are scored so place and street photographs are kept and
clearly off-topic images are dropped. If too few relevant photos remain, the
response falls back to a city-wide Indore street search and says so via
``scope``.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import get_settings
from app.geospatial.dataset import _load  # shared JSON loader
from app.utils import cache

API_URL = "https://commons.wikimedia.org/w/api.php"
CACHE_SECONDS = 6 * 60 * 60
TAG_RE = re.compile(r"<[^>]+>")
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MIN_WIDTH = 700
MIN_HEIGHT = 450
MIN_RESULTS = 3

# Words that suggest the photo shows a place, street or structure.
PLACE_WORDS = (
    "road",
    "street",
    "marg",
    "bridge",
    "flyover",
    "metro",
    "rail",
    "station",
    "bus",
    "traffic",
    "market",
    "chowk",
    "square",
    "construction",
    "drain",
    "nala",
    "river",
    "lake",
    "garden",
    "park",
    "tower",
    "mall",
    "court",
    "stadium",
    "palace",
    "temple",
    "mosque",
    "church",
    "gurudwara",
    "fort",
    "gate",
    "nagar",
    "colony",
    "city",
    "building",
    "hospital",
    "school",
    "college",
    "university",
    "airport",
)

# Words that make an image obviously off-topic for a city-condition page.
OFF_TOPIC_WORDS = (
    "food",
    "dish",
    "egg",
    "thepla",
    "flower",
    "plant",
    "leaf",
    "leaves",
    "cannabis",
    "tree",
    "bird",
    "animal",
    "insect",
    "portrait",
    "woman",
    "man ",
    "child",
    "students",
    "games",
    "beauty",
    "cricket bat",
    "car museum",
    "painting",
    "abstract",
    "canvas",
    "aloevera",
    "logo",
    "map",
    "diagram",
    "poster",
    "flag",
)


class CommonsError(RuntimeError):
    """Raised when the Commons API cannot be read."""


def _clean(value: str | None) -> str:
    if not value:
        return ""
    return TAG_RE.sub("", value).replace("&amp;", "&").strip()


def _title_score(title: str) -> int:
    lowered = title.lower()
    if any(word in lowered for word in OFF_TOPIC_WORDS):
        return -10
    score = 0
    if any(word in lowered for word in PLACE_WORDS):
        score += 3
    if "indore" in lowered:
        score += 2
    return score


def _photo(page: dict[str, Any]) -> dict[str, Any] | None:
    info = (page.get("imageinfo") or [{}])[0]
    if not info:
        return None
    if info.get("mime") not in ALLOWED_MIME:
        return None
    width = int(info.get("width") or 0)
    height = int(info.get("height") or 0)
    if width < MIN_WIDTH or height < MIN_HEIGHT:
        return None
    title = str(page.get("title") or "")
    if _title_score(title) <= 0:
        return None

    meta = info.get("extmetadata") or {}
    return {
        "id": str(page.get("pageid")),
        "title": title.removeprefix("File:"),
        "author": _clean((meta.get("Artist") or {}).get("value")) or "Unknown",
        "license": _clean((meta.get("LicenseShortName") or {}).get("value")) or "See Commons",
        "licenseUrl": _clean((meta.get("LicenseUrl") or {}).get("value")),
        "pageUrl": info.get("descriptionurl"),
        "imageUrl": info.get("url"),
        "thumbUrl": info.get("thumburl") or info.get("url"),
        "width": width,
        "height": height,
        "score": _title_score(title),
    }


def _query(params: dict[str, Any], transport: httpx.BaseTransport | None) -> list[dict[str, Any]]:
    settings = get_settings()
    request = {
        "action": "query",
        "ggsnamespace": 6,
        "prop": "imageinfo|coordinates",
        "iiprop": "url|extmetadata|size|mime",
        "iiurlwidth": 900,
        "format": "json",
        "formatversion": 2,
        **params,
    }
    try:
        with httpx.Client(
            timeout=15.0,
            transport=transport,
            follow_redirects=True,
            headers={"User-Agent": settings.user_agent},
        ) as client:
            response = client.get(API_URL, params=request)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise CommonsError(f"Commons read failed: {exc}") from exc
    return payload.get("query", {}).get("pages") or []


def _ranked(pages: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    photos = [item for item in (_photo(page) for page in pages) if item]
    photos.sort(key=lambda item: item["score"], reverse=True)
    for photo in photos:
        photo.pop("score", None)
    return photos[:limit]


def curated_photos(limit: int) -> list[dict[str, Any]]:
    """Verified Indore street photos, used when nothing relevant is nearby.

    Metadata (author, licence, page URL) is stored with the image so the UI can
    always attribute it, even with the Commons API offline.
    """
    photos = _load("indore-photos.json")["photos"]
    return photos[:limit]


def fetch_nearby_photos(
    lat: float,
    lng: float,
    radius: int = 2500,
    limit: int = 8,
    *,
    transport: httpx.BaseTransport | None = None,
) -> dict[str, Any]:
    key = f"commons:v3:{lat:.4f}:{lng:.4f}:{radius}:{limit}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    pages = _query(
        {
            "generator": "geosearch",
            "ggscoord": f"{lat:.5f}|{lng:.5f}",
            "ggsradius": radius,
            "ggslimit": max(limit * 3, 20),
        },
        transport,
    )
    photos = _ranked(pages, limit)
    scope = "nearby"

    if len(photos) < MIN_RESULTS:
        # Nothing relevant is geotagged here. Commons search is unreliable and
        # geosearch returns whatever happens to be nearby, so fall back to a
        # small verified set of Indore street photos and label the change.
        photos = curated_photos(limit)
        scope = "city"

    result = {
        "lat": lat,
        "lng": lng,
        "radius": radius,
        "scope": scope,
        "provenance": "public_dataset",
        "source": "wikimedia-commons",
        "fetchedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "note": (
            "Real photographs taken near this point, under the licence shown. "
            "They are not a verified record of a specific reported defect."
            if scope == "nearby"
            else "No relevant photos are geotagged at this point, so these are real Indore "
            "street photographs from Wikimedia Commons, not photos of this exact location."
        ),
        "photos": photos,
    }
    cache.set(key, result, CACHE_SECONDS)
    return result
