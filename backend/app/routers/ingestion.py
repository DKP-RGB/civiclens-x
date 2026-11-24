"""Ingestion provenance and per-cell OSM landuse features."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.ingestion.service import SOURCE_OSM_LANDUSE, latest_runs, latest_success
from app.models.cell_feature import CellFeature
from app.schemas.weather import CellFeatureOut, FeatureSummaryOut, IngestionRunOut

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


@router.get("/runs", response_model=list[IngestionRunOut])
def get_runs(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[IngestionRunOut]:
    return [IngestionRunOut.model_validate(run) for run in latest_runs(db, limit)]


@router.get("/features/summary", response_model=FeatureSummaryOut)
def get_feature_summary(db: Session = Depends(get_db)) -> FeatureSummaryOut:
    totals = db.execute(
        select(
            func.count(CellFeature.cell_id),
            func.sum(case((CellFeature.built_up_share > 0, 1), else_=0)),
            func.avg(CellFeature.built_up_share),
            func.avg(CellFeature.green_share),
            func.avg(CellFeature.water_share),
            func.max(CellFeature.samples),
            func.max(CellFeature.fetched_at),
        )
    ).one()
    cells = int(totals[0] or 0)
    run = latest_success(db, SOURCE_OSM_LANDUSE)
    return FeatureSummaryOut(
        cells=cells,
        cells_with_built_up=int(totals[1] or 0),
        mean_built_up_share=float(totals[2]) if totals[2] is not None else None,
        mean_green_share=float(totals[3]) if totals[3] is not None else None,
        mean_water_share=float(totals[4]) if totals[4] is not None else None,
        samples_per_cell=int(totals[5]) if totals[5] is not None else None,
        source=SOURCE_OSM_LANDUSE if cells else None,
        fetched_at=totals[6],
        last_success_at=run.finished_at if run else None,
    )


@router.get("/features/{cell_id}", response_model=CellFeatureOut)
def get_cell_feature(cell_id: str, db: Session = Depends(get_db)) -> CellFeatureOut:
    row = db.get(CellFeature, cell_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail="No landuse feature for this cell. Run `python -m app.ingestion.cli landuse`.",
        )
    return CellFeatureOut.model_validate(row)
