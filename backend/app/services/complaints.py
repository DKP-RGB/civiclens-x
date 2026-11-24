"""Complaint business logic: creation, triage and timeline updates."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.geospatial.dataset import locality_map
from app.models import Complaint, ComplaintEvent
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintNoteCreate,
    ComplaintOut,
    ComplaintUpdate,
    LatLng,
    TimelineEntryOut,
)
from app.schemas.enums import (
    DEPARTMENT_BY_CATEGORY,
    STEP_NOTES,
    ComplaintStatus,
    IncidentCategory,
    Priority,
)
from app.services import risk as risk_service
from app.services.storage import save_data_url
from app.utils.time import now_iso


def to_out(complaint: Complaint) -> ComplaintOut:
    return ComplaintOut(
        id=complaint.id,
        ref=complaint.ref,
        category=complaint.category,
        title=complaint.title,
        description=complaint.description,
        address=complaint.address,
        locality_id=complaint.locality_id,
        location=LatLng(lng=complaint.lng, lat=complaint.lat),
        status=complaint.status,
        priority=complaint.priority,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        assigned_department=complaint.assigned_department,
        citizen_name=complaint.citizen_name,
        citizen_phone=complaint.citizen_phone,
        linked_cell_id=complaint.linked_cell_id,
        timeline=[
            TimelineEntryOut(
                status=event.status,
                label=event.label,
                at=event.at,
                actor=event.actor,
                note=event.note,
            )
            for event in complaint.timeline
        ],
        resolution_note=complaint.resolution_note,
        risk_at_report=complaint.risk_at_report,
        image_url=complaint.image_url,
        image_provenance=complaint.image_provenance,
    )


def _next_ref(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    count = db.scalar(select(func.count()).select_from(Complaint)) or 0
    sequence = 200 + count
    while True:
        candidate = f"CLX-{year}-{sequence:04d}"
        exists = db.scalar(select(Complaint.id).where(Complaint.ref == candidate))
        if not exists:
            return candidate
        sequence += 1


def create_complaint(db: Session, payload: ComplaintCreate) -> Complaint:
    cell, _ = risk_service.get_nearest_cell(payload.location.lng, payload.location.lat)
    locality_id = payload.locality_id if payload.locality_id in locality_map() else cell["localityId"]

    category: IncidentCategory = payload.category
    risk_category = (
        "road_deterioration" if category in ("potholes", "road_damage") else "waterlogging"
    )
    risk_at_report = risk_service.compute_cell_risk(
        cell, risk_category, risk_service.DEMO_RISK_INPUTS
    )["probability"]

    image_url = None
    if payload.image_data_url:
        image_url = save_data_url(payload.image_data_url)

    created_at = now_iso()
    complaint = Complaint(
        id=f"cmp-{uuid4().hex[:10]}",
        ref=_next_ref(db),
        category=category,
        title=payload.title.strip(),
        description=payload.description.strip(),
        address=payload.address.strip(),
        locality_id=locality_id,
        lng=payload.location.lng,
        lat=payload.location.lat,
        status="submitted",
        priority=payload.priority,
        citizen_name=payload.citizen_name.strip(),
        citizen_phone=payload.citizen_phone,
        assigned_department=DEPARTMENT_BY_CATEGORY[category],
        linked_cell_id=cell["id"],
        risk_at_report=risk_at_report,
        image_url=image_url,
        image_provenance="citizen_upload" if image_url else None,
        resolution_note=None,
        created_at=created_at,
        updated_at=created_at,
    )
    complaint.timeline.append(
        ComplaintEvent(
            status="submitted",
            label=STEP_NOTES["submitted"],
            at=created_at,
            actor="citizen",
            note=None,
        )
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


def list_complaints(
    db: Session,
    *,
    status: ComplaintStatus | None = None,
    priority: Priority | None = None,
    category: IncidentCategory | None = None,
    locality_id: str | None = None,
    query: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Complaint], int]:
    conditions = []
    if status:
        conditions.append(Complaint.status == status)
    if priority:
        conditions.append(Complaint.priority == priority)
    if category:
        conditions.append(Complaint.category == category)
    if locality_id:
        conditions.append(Complaint.locality_id == locality_id)
    if query:
        term = f"%{query.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(Complaint.title).like(term),
                func.lower(Complaint.ref).like(term),
                func.lower(Complaint.address).like(term),
                func.lower(Complaint.citizen_name).like(term),
            )
        )

    total = db.scalar(select(func.count()).select_from(Complaint).where(*conditions)) or 0
    items = (
        db.scalars(
            select(Complaint)
            .where(*conditions)
            .order_by(Complaint.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        .unique()
        .all()
    )
    return list(items), total


def get_complaint(db: Session, complaint_id: str) -> Complaint | None:
    return db.get(Complaint, complaint_id)


def add_note(
    db: Session, complaint: Complaint, payload: ComplaintNoteCreate
) -> Complaint:
    at = now_iso()
    complaint.timeline.append(
        ComplaintEvent(
            status=complaint.status,
            label="Note added",
            at=at,
            actor=payload.actor,
            note=payload.note.strip(),
        )
    )
    complaint.updated_at = at
    db.commit()
    db.refresh(complaint)
    return complaint


def update_complaint(
    db: Session, complaint: Complaint, payload: ComplaintUpdate
) -> Complaint:
    changed = False
    at = now_iso()

    if payload.priority and payload.priority != complaint.priority:
        complaint.priority = payload.priority
        changed = True

    if payload.status and payload.status != complaint.status:
        complaint.status = payload.status
        complaint.timeline.append(
            ComplaintEvent(
                status=payload.status,
                label=STEP_NOTES[payload.status],
                at=at,
                actor=payload.actor,
                note=payload.note.strip() if payload.note else None,
            )
        )
        if payload.status == "resolved" and payload.note:
            complaint.resolution_note = payload.note.strip()
        changed = True
    elif payload.note:
        complaint.timeline.append(
            ComplaintEvent(
                status=complaint.status,
                label="Note added",
                at=at,
                actor=payload.actor,
                note=payload.note.strip(),
            )
        )
        changed = True

    if changed:
        complaint.updated_at = at
        db.commit()
        db.refresh(complaint)
    return complaint
