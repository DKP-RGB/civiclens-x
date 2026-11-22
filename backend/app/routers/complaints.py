"""Complaint API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintListOut,
    ComplaintNoteCreate,
    ComplaintOut,
    ComplaintUpdate,
)
from app.schemas.enums import ComplaintStatus, IncidentCategory, Priority
from app.services import complaints as service
from app.services.storage import UploadError

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.get("", response_model=ComplaintListOut)
def list_complaints(
    status_filter: ComplaintStatus | None = Query(default=None, alias="status"),
    priority: Priority | None = None,
    category: IncidentCategory | None = None,
    locality_id: str | None = None,
    q: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ComplaintListOut:
    items, total = service.list_complaints(
        db,
        status=status_filter,
        priority=priority,
        category=category,
        locality_id=locality_id,
        query=q,
        limit=limit,
        offset=offset,
    )
    return ComplaintListOut(
        items=[service.to_out(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate, db: Session = Depends(get_db)
) -> ComplaintOut:
    try:
        complaint = service.create_complaint(db, payload)
    except UploadError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    return service.to_out(complaint)


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(complaint_id: str, db: Session = Depends(get_db)) -> ComplaintOut:
    complaint = service.get_complaint(db, complaint_id)
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return service.to_out(complaint)


@router.patch("/{complaint_id}", response_model=ComplaintOut)
def update_complaint(
    complaint_id: str,
    payload: ComplaintUpdate,
    db: Session = Depends(get_db),
) -> ComplaintOut:
    complaint = service.get_complaint(db, complaint_id)
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    updated = service.update_complaint(db, complaint, payload)
    return service.to_out(updated)


@router.post("/{complaint_id}/notes", response_model=ComplaintOut)
def add_note(
    complaint_id: str,
    payload: ComplaintNoteCreate,
    db: Session = Depends(get_db),
) -> ComplaintOut:
    complaint = service.get_complaint(db, complaint_id)
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    updated = service.add_note(db, complaint, payload)
    return service.to_out(updated)
