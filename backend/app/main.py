"""CivicLens X FastAPI application.

Phase 3 scope: complaint persistence, risk scoring parity with the frontend,
and dataset metadata. The frontend still runs on its bundled data until the
integration phase; these endpoints are the contract it will switch to.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.database.seed import seed_if_empty
from app.database.session import SessionLocal, create_all
from app.routers import complaints, health, meta, risk

logger = logging.getLogger("civiclens")

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    logging.basicConfig(level=settings.log_level.upper())
    create_all()
    with SessionLocal() as db:
        created = seed_if_empty(db)
        if created:
            logger.info("Seeded %s demo complaints", created)
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    logger.info("CivicLens X API ready (%s)", settings.app_env)
    yield


settings.upload_path.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="CivicLens X API",
    version=settings.app_version,
    description=(
        "Predictive urban intelligence for Indore. Risk scores are illustrative "
        "prototype output, not a trained model. See /api/v1/meta for provenance."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(complaints.router, prefix=settings.api_prefix)
app.include_router(risk.router, prefix=settings.api_prefix)
app.include_router(meta.router, prefix=settings.api_prefix)

app.mount("/uploads", StaticFiles(directory=str(settings.upload_path)), name="uploads")


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")
