"""Seed the database with the same demo complaints the frontend ships."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.geospatial.dataset import complaint_seeds
from app.models import Complaint, ComplaintEvent


def seed_if_empty(db: Session) -> int:
    """Insert demo complaints once. Returns the number of records created."""
    existing = db.scalar(select(func.count()).select_from(Complaint)) or 0
    if existing:
        return 0

    seeds = complaint_seeds()
    for item in seeds:
        complaint = Complaint(
            id=item["id"],
            ref=item["ref"],
            category=item["category"],
            title=item["title"],
            description=item["description"],
            address=item["address"],
            locality_id=item["localityId"],
            lng=item["location"]["lng"],
            lat=item["location"]["lat"],
            status=item["status"],
            priority=item["priority"],
            citizen_name=item["citizenName"],
            citizen_phone=item.get("citizenPhone"),
            assigned_department=item["assignedDepartment"],
            linked_cell_id=item.get("linkedCellId"),
            risk_at_report=item.get("riskAtReport"),
            image_url=item.get("imageUrl"),
            image_provenance=item.get("imageProvenance"),
            resolution_note=item.get("resolutionNote"),
            created_at=item["createdAt"],
            updated_at=item["updatedAt"],
        )
        for entry in item.get("timeline", []):
            complaint.timeline.append(
                ComplaintEvent(
                    status=entry["status"],
                    label=entry["label"],
                    at=entry["at"],
                    actor=entry["actor"],
                    note=entry.get("note"),
                )
            )
        db.add(complaint)

    db.commit()
    return len(seeds)
