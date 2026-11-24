"""Application configuration loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "CivicLens X"
    app_env: str = "development"
    app_version: str = "0.3.0"
    api_prefix: str = "/api/v1"
    log_level: str = "INFO"

    # SQLite by default so the project runs with zero setup. Set DATABASE_URL to
    # a PostGIS/PostgreSQL URL for the full deployment.
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'civiclens.db').as_posix()}"

    upload_dir: str = str(BACKEND_DIR / "uploads")
    max_upload_mb: int = 8

    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173"
    )

    # Phase 6: Gemini explanations. Blank means the rule-based fallback is used.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    model_dir: str = str(BACKEND_DIR / "artifacts")
    model_version: str = "0.1.0-prototype"

    # Phase 4: keyless public data ingestion.
    city_name: str = "Indore"
    city_lat: float = 22.7196
    city_lng: float = 75.8577
    city_timezone: str = "Asia/Kolkata"
    # south,west,north,east - covers the Indore study grid.
    city_bbox: str = "22.58,75.70,22.87,76.02"
    ingestion_timeout_seconds: float = 120.0
    forecast_stale_hours: int = 12
    user_agent: str = "CivicLensX/0.4 (research prototype; Indore urban intelligence)"

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def city_bbox_tuple(self) -> tuple[float, float, float, float]:
        """Return (south, west, north, east) parsed from CITY_BBOX."""
        south, west, north, east = (float(part) for part in self.city_bbox.split(","))
        return south, west, north, east

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        return path if path.is_absolute() else (BACKEND_DIR / path)


@lru_cache
def get_settings() -> Settings:
    return Settings()
