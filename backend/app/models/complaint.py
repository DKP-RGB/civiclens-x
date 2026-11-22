"""Citizen complaints persisted by the API."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

if TYPE_CHECKING:
    from app.models.complaint_event import ComplaintEvent


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    ref: Mapped[str] = mapped_column(String(32), unique=True, index=True)

    category: Mapped[str] = mapped_column(String(32), index=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    address: Mapped[str] = mapped_column(String(300))
    locality_id: Mapped[str] = mapped_column(String(64), index=True)

    lng: Mapped[float] = mapped_column(Float)
    lat: Mapped[float] = mapped_column(Float)

    status: Mapped[str] = mapped_column(String(32), index=True, default="submitted")
    priority: Mapped[str] = mapped_column(String(16), index=True, default="medium")

    citizen_name: Mapped[str] = mapped_column(String(120))
    citizen_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    assigned_department: Mapped[str] = mapped_column(String(120))

    linked_cell_id: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    risk_at_report: Mapped[float | None] = mapped_column(Float, nullable=True)

    image_url: Mapped[str | None] = mapped_column(String(400), nullable=True)
    image_provenance: Mapped[str | None] = mapped_column(String(40), nullable=True)

    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ISO-8601 UTC strings. Stored as text so SQLite and PostgreSQL return the
    # exact same wire format the frontend already uses.
    created_at: Mapped[str] = mapped_column(String(40), index=True)
    updated_at: Mapped[str] = mapped_column(String(40))

    timeline: Mapped[list["ComplaintEvent"]] = relationship(
        back_populates="complaint",
        cascade="all, delete-orphan",
        order_by="ComplaintEvent.at",
        lazy="selectin",
    )
