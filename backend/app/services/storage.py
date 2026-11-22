"""Save citizen-uploaded photos supplied as base64 data URLs."""

from __future__ import annotations

import base64
import binascii
import re
import uuid

from app.core.config import get_settings

_ALLOWED = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}
_PATTERN = re.compile(r"^data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$", re.DOTALL)


class UploadError(ValueError):
    """Raised when an upload is invalid or too large."""


def save_data_url(data_url: str) -> str:
    settings = get_settings()
    match = _PATTERN.match(data_url.strip())
    if not match:
        raise UploadError("Photo must be a PNG, JPEG or WebP data URL.")

    mime, payload = match.group(1), match.group(2)
    try:
        raw = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise UploadError("Photo data is not valid base64.") from exc

    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(raw) > max_bytes:
        raise UploadError(f"Photo exceeds the {settings.max_upload_mb} MB limit.")
    if len(raw) < 64:
        raise UploadError("Photo data is too small to be an image.")

    target_dir = settings.upload_path
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{_ALLOWED[mime]}"
    (target_dir / filename).write_bytes(raw)
    return f"/uploads/{filename}"
