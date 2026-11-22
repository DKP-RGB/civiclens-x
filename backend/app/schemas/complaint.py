"""Complaint request and response schemas."""

from __future__ import annotations

from typing import Self

from pydantic import Field, model_validator

from app.schemas.common import CamelModel
from app.schemas.enums import ComplaintStatus, IncidentCategory, Priority, TimelineActor

# Indore bounding box (slightly padded) used to reject out-of-city reports.
INDORE_BOUNDS = {"min_lng": 75.70, "max_lng": 76.02, "min_lat": 22.58, "max_lat": 22.87}


class LatLng(CamelModel):
    lng: float = Field(ge=-180, le=180)
    lat: float = Field(ge=-90, le=90)


class TimelineEntryOut(CamelModel):
    status: ComplaintStatus
    label: str
    at: str
    actor: TimelineActor
    note: str | None = None


class ComplaintOut(CamelModel):
    id: str
    ref: str
    category: IncidentCategory
    title: str
    description: str
    address: str
    locality_id: str
    location: LatLng
    status: ComplaintStatus
    priority: Priority
    created_at: str
    updated_at: str
    assigned_department: str
    citizen_name: str
    citizen_phone: str | None = None
    linked_cell_id: str | None = None
    timeline: list[TimelineEntryOut]
    resolution_note: str | None = None
    risk_at_report: float | None = None
    image_url: str | None = None
    image_provenance: str | None = None


class ComplaintCreate(CamelModel):
    category: IncidentCategory
    title: str = Field(min_length=4, max_length=140)
    description: str = Field(min_length=10, max_length=2000)
    address: str = Field(min_length=3, max_length=300)
    locality_id: str | None = None
    location: LatLng
    citizen_name: str = Field(default="Aarav Sharma", min_length=1, max_length=120)
    citizen_phone: str | None = Field(default=None, max_length=32)
    priority: Priority = "medium"
    image_data_url: str | None = Field(default=None, max_length=12_000_000)

    @model_validator(mode="after")
    def _inside_indore(self) -> Self:
        loc = self.location
        if not (
            INDORE_BOUNDS["min_lng"] <= loc.lng <= INDORE_BOUNDS["max_lng"]
            and INDORE_BOUNDS["min_lat"] <= loc.lat <= INDORE_BOUNDS["max_lat"]
        ):
            raise ValueError("Location must be inside Indore. CivicLens X does not cover other cities.")
        return self


class ComplaintUpdate(CamelModel):
    status: ComplaintStatus | None = None
    priority: Priority | None = None
    note: str | None = Field(default=None, max_length=600)
    actor: TimelineActor = "authority"


class ComplaintNoteCreate(CamelModel):
    note: str = Field(min_length=1, max_length=600)
    actor: TimelineActor = "citizen"


class ComplaintListOut(CamelModel):
    items: list[ComplaintOut]
    total: int
    limit: int
    offset: int
