"""Dataset metadata and provenance endpoints."""

from __future__ import annotations


def test_meta_reports_grid_and_model(client):
    response = client.get("/api/v1/meta")
    assert response.status_code == 200
    body = response.json()

    assert body["city"] == "Indore"
    assert body["grid"]["totalCells"] == 1887
    assert body["grid"]["cellSizeMeters"] == 250
    assert body["model"]["trainedAt"] is None
    # No accuracy may be claimed before a trained model exists.
    assert all(value is None for value in body["model"]["metrics"].values())
    assert len(body["provenance"]) >= 5


def test_localities_are_inside_indore(client):
    response = client.get("/api/v1/localities")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 20
    for item in items:
        assert 75.70 <= item["centroid"]["lng"] <= 76.02
        assert 22.58 <= item["centroid"]["lat"] <= 22.87


def test_grid_returns_all_cells(client):
    response = client.get("/api/v1/grid")
    assert response.status_code == 200
    body = response.json()
    assert len(body["cells"]) == body["meta"]["totalCells"] == 1887


def test_incidents_are_labelled_simulated(client):
    response = client.get("/api/v1/incidents", params={"limit": 5})
    assert response.status_code == 200
    items = response.json()
    assert items
    assert all(item["source"] == "simulated" for item in items)
