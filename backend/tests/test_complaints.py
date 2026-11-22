"""Complaint persistence, triage and validation."""

from __future__ import annotations

VALID_PAYLOAD = {
    "category": "waterlogging",
    "title": "Water pooling outside the test market",
    "description": "Standing water covers the service lane after rain and does not drain for hours.",
    "address": "Vijay Nagar, Indore",
    "localityId": "vijay-nagar",
    "location": {"lng": 75.8917, "lat": 22.7521},
    "citizenName": "Test Citizen",
    "priority": "high",
}


def test_seeded_complaints_are_available(client):
    response = client.get("/api/v1/complaints", params={"limit": 100})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 24
    assert len(body["items"]) >= 24


def test_seeded_complaint_detail(client):
    response = client.get("/api/v1/complaints/cmp-001")
    assert response.status_code == 200
    body = response.json()
    assert body["ref"] == "CLX-2026-0121"
    assert body["linkedCellId"]
    assert len(body["timeline"]) >= 1


def test_unknown_complaint_returns_404(client):
    assert client.get("/api/v1/complaints/nope").status_code == 404


def test_create_complaint_links_cell_and_timeline(client):
    response = client.post("/api/v1/complaints", json=VALID_PAYLOAD)
    assert response.status_code == 201
    body = response.json()

    assert body["status"] == "submitted"
    assert body["linkedCellId"]
    assert body["assignedDepartment"] == "Stormwater & Drainage Cell"
    assert body["ref"].startswith("CLX-")
    assert len(body["timeline"]) == 1
    assert body["timeline"][0]["status"] == "submitted"
    assert body["timeline"][0]["actor"] == "citizen"
    assert 0 <= body["riskAtReport"] <= 1
    assert body["location"] == VALID_PAYLOAD["location"]

    # Detail endpoint returns the same record.
    detail = client.get(f"/api/v1/complaints/{body['id']}")
    assert detail.status_code == 200
    assert detail.json()["id"] == body["id"]


def test_update_status_appends_timeline(client):
    created = client.post("/api/v1/complaints", json=VALID_PAYLOAD).json()

    response = client.patch(
        f"/api/v1/complaints/{created['id']}",
        json={"status": "under_review", "priority": "urgent", "note": "Zone office reviewing."},
    )
    assert response.status_code == 200
    body = response.json()

    assert body["status"] == "under_review"
    assert body["priority"] == "urgent"
    assert len(body["timeline"]) == 2
    assert body["timeline"][-1]["status"] == "under_review"
    assert body["timeline"][-1]["note"] == "Zone office reviewing."


def test_resolving_sets_resolution_note(client):
    created = client.post("/api/v1/complaints", json=VALID_PAYLOAD).json()

    response = client.patch(
        f"/api/v1/complaints/{created['id']}",
        json={"status": "resolved", "note": "Drain desilted and lane cleared."},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["resolutionNote"] == "Drain desilted and lane cleared."


def test_add_note(client):
    created = client.post("/api/v1/complaints", json=VALID_PAYLOAD).json()

    response = client.post(
        f"/api/v1/complaints/{created['id']}/notes",
        json={"note": "Water is deeper in the evening."},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["timeline"]) == 2
    assert body["timeline"][-1]["label"] == "Note added"


def test_filter_by_status(client):
    response = client.get("/api/v1/complaints", params={"status": "resolved", "limit": 100})
    assert response.status_code == 200
    items = response.json()["items"]
    assert items
    assert all(item["status"] == "resolved" for item in items)


def test_search_by_title(client):
    response = client.get("/api/v1/complaints", params={"q": "pothole", "limit": 100})
    assert response.status_code == 200
    items = response.json()["items"]
    assert items
    assert all("pothole" in item["title"].lower() for item in items)


def test_location_outside_indore_is_rejected(client):
    payload = {
        **VALID_PAYLOAD,
        "location": {"lng": 72.8777, "lat": 19.0760},  # Mumbai
    }
    response = client.post("/api/v1/complaints", json=payload)
    assert response.status_code == 422


def test_short_description_is_rejected(client):
    response = client.post("/api/v1/complaints", json={**VALID_PAYLOAD, "description": "bad"})
    assert response.status_code == 422


def test_invalid_photo_data_url_is_rejected(client):
    response = client.post(
        "/api/v1/complaints",
        json={**VALID_PAYLOAD, "imageDataUrl": "data:image/png;base64,not-really-base64!!"},
    )
    assert response.status_code == 422
    assert "Photo" in response.json()["detail"]
