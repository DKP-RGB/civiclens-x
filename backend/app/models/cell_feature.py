"""Per-cell land-use shares derived from OpenStreetMap landuse polygons.

The risk scorer still uses its bundled built-up proxy. These rows are the real
replacement and are exposed read-only until the Phase 5 model switch.
"""

from __future__ import annotations

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class CellFeature(Base):
    __tablename__ = "cell_features"

    cell_id: Mapped[str] = mapped_column(String(16), primary_key=True)
    built_up_share: Mapped[float] = mapped_column(Float, default=0.0)
    green_share: Mapped[float] = mapped_column(Float, default=0.0)
    water_share: Mapped[float] = mapped_column(Float, default=0.0)
    samples: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str] = mapped_column(String(48))
    fetched_at: Mapped[str] = mapped_column(String(40))
