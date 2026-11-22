"""Pytest fixtures: isolated SQLite database and upload directory."""

from __future__ import annotations

import os
import shutil
from pathlib import Path

import pytest

TEST_DIR = Path(__file__).resolve().parent
TEST_DB = TEST_DIR / "test_civiclens.db"
TEST_UPLOADS = TEST_DIR / "test_uploads"

# Must be set before the app modules import settings.
TEST_DB.unlink(missing_ok=True)
shutil.rmtree(TEST_UPLOADS, ignore_errors=True)
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ["UPLOAD_DIR"] = str(TEST_UPLOADS)


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session", autouse=True)
def _cleanup():
    yield
    from app.database.session import engine

    engine.dispose()
    TEST_DB.unlink(missing_ok=True)
    shutil.rmtree(TEST_UPLOADS, ignore_errors=True)
