"""OpenStreetMap construction features ingested by the works CLI."""

from __future__ import annotations

from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class ConstructionSite(Base):
    __tablename__ = "construction_sites"

    osm_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    kind: Mapped[str] = mapped_column(String(24), default="other")
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    tags: Mapped[str] = mapped_column(String(2000), default="{}")
    fetched_at: Mapped[str] = mapped_column(String(40))
