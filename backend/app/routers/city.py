"""City works: sourced major projects plus live OSM construction features."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.ingestion.service import SOURCE_OSM_CONSTRUCTION
from app.models.construction import ConstructionSite
from app.models.ingestion import IngestionRun
from app.services.city import city_projects, city_projects_meta

router = APIRouter(prefix="/city", tags=["city"])


@router.get("/works")
def get_works(db: Session = Depends(get_db)) -> dict:
    meta = city_projects_meta()
    rows = (
        db.execute(
            select(ConstructionSite).order_by(ConstructionSite.kind, ConstructionSite.name)
        )
        .scalars()
        .all()
    )
    last_run = (
        db.execute(
            select(IngestionRun)
            .where(
                IngestionRun.source == SOURCE_OSM_CONSTRUCTION,
                IngestionRun.status == "success",
            )
            .order_by(IngestionRun.finished_at.desc())
        )
        .scalars()
        .first()
    )

    sites = []
    for row in rows:
        try:
            tags = json.loads(row.tags)
        except ValueError:
            tags = {}
        sites.append(
            {
                "osmId": row.osm_id,
                "kind": row.kind,
                "name": row.name,
                "lat": row.lat,
                "lng": row.lng,
                "tags": tags,
            }
        )

    return {
        "asOf": meta.get("asOf"),
        "notes": meta.get("notes"),
        "provenance": "public_dataset",
        "projects": city_projects(),
        "sites": sites,
        "siteCount": len(sites),
        "lastIngestedAt": last_run.finished_at if last_run else None,
        "sources": [
            {"name": "OpenStreetMap contributors", "url": "https://www.openstreetmap.org/copyright", "license": "ODbL 1.0"},
            {"name": "Wikimedia Commons", "url": "https://commons.wikimedia.org", "license": "per-file"},
        ],
    }
