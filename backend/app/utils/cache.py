"""Tiny in-process TTL cache for keyless third-party reads.

Only used for short-lived live reads (weather nowcast, nearby photos). It is
deliberately memory-only: a restart simply refetches, and nothing here is
treated as stored provenance.
"""

from __future__ import annotations

import time
from threading import Lock
from typing import Any

_entries: dict[str, tuple[float, Any]] = {}
_lock = Lock()


def get(key: str) -> Any | None:
    entry = _entries.get(key)
    if entry is None:
        return None
    expires_at, value = entry
    if time.monotonic() >= expires_at:
        _entries.pop(key, None)
        return None
    return value


def set(key: str, value: Any, ttl_seconds: float) -> None:
    with _lock:
        _entries[key] = (time.monotonic() + ttl_seconds, value)


def clear() -> None:
    with _lock:
        _entries.clear()
