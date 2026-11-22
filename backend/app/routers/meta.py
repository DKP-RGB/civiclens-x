"""Metadata, localities, grid and incident endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.geospatial.dataset import grid_cells, grid_meta, incidents, localities
from app.schemas.enums import IncidentCategory
from app.schemas.meta import (
    GridResponse,
    IncidentOut,
    MetaResponse,
)
from app.schemas.risk import LocalityOut
from app.services.meta import meta_payload

router = APIRouter(tags=["metadata"])


@router.get("/meta", response_model=MetaResponse)
def get_meta() -> MetaResponse:
    return MetaResponse.model_validate(meta_payload())


@router.get("/localities", response_model=list[LocalityOut])
def get_localities() -> list[LocalityOut]:
    return [LocalityOut.model_validate(item) for item in localities()]


@router.get("/grid", response_model=GridResponse)
def get_grid() -> GridResponse:
    return GridResponse.model_validate({"meta": grid_meta(), "cells": grid_cells()})


@router.get("/incidents", response_model=list[IncidentOut])
def get_incidents(
    category: IncidentCategory | None = None,
    locality_id: str | None = None,
    limit: int = Query(default=200, ge=1, le=1000),
) -> list[IncidentOut]:
    items = incidents()
    if category:
        items = [item for item in items if item["category"] == category]
    if locality_id:
        items = [item for item in items if item["localityId"] == locality_id]
    return [IncidentOut.model_validate(item) for item in items[:limit]]
