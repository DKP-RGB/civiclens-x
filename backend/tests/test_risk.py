"""Risk surface and scenario endpoints."""

from __future__ import annotations


def test_risk_surface_matches_grid(client):
    response = client.get("/api/v1/risk")
    assert response.status_code == 200
    body = response.json()

    assert len(body["cells"]) == 1887
    summary = body["summary"]
    assert summary["totalCells"] == 1887
    assert sum(summary["counts"].values()) == 1887
    assert 0 <= summary["meanProbability"] <= 1


def test_risk_cells_have_factors_and_levels(client):
    response = client.get("/api/v1/risk")
    cell = response.json()["cells"][0]

    assert cell["category"] == "waterlogging"
    assert cell["level"] in {"low", "moderate", "high", "critical"}
    assert 0 <= cell["probability"] <= 1
    assert 0.05 <= cell["uncertainty"] <= 0.25
    assert 1 <= len(cell["factors"]) <= 5
    total = sum(factor["contribution"] for factor in cell["factors"])
    assert 0.98 <= total <= 1.02


def test_unknown_cell_returns_404(client):
    response = client.get("/api/v1/risk/cells/does-not-exist")
    assert response.status_code == 404


def test_summary_endpoint_is_compact(client):
    response = client.get("/api/v1/risk/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["totalCells"] == 1887
    assert len(body["topCells"]) == 10
    assert "cells" not in body


def test_road_category_works(client):
    response = client.get("/api/v1/risk", params={"category": "road_deterioration"})
    assert response.status_code == 200
    assert response.json()["cells"][0]["category"] == "road_deterioration"


def test_scenario_higher_rain_increases_risk(client):
    low = client.post(
        "/api/v1/risk/simulate",
        json={"rainfallMmPerHour": 5, "rainfallDurationHours": 2},
    )
    high = client.post(
        "/api/v1/risk/simulate",
        json={"rainfallMmPerHour": 40, "rainfallDurationHours": 12},
    )
    assert low.status_code == high.status_code == 200

    low_mean = low.json()["scenarioSummary"]["meanProbability"]
    high_mean = high.json()["scenarioSummary"]["meanProbability"]
    assert high_mean > low_mean


def test_scenario_rejects_invalid_values(client):
    response = client.post(
        "/api/v1/risk/simulate",
        json={"rainfallMmPerHour": 500, "rainfallDurationHours": 100},
    )
    assert response.status_code == 422
