"""Live endpoints, the terrain screening model and Commons photo filtering.

No test touches the public internet: every HTTP call uses a mock transport.
"""

from __future__ import annotations

import httpx

from app.services import commons, hydrology, live_weather, susceptibility
from app.utils import cache


def _image(page_id: int, title: str, width: int = 1200, height: int = 800) -> dict:
    return {
        "pageid": page_id,
        "title": title,
        "imageinfo": [
            {
                "mime": "image/jpeg",
                "width": width,
                "height": height,
                "url": f"https://upload.wikimedia.org/{page_id}.jpg",
                "thumburl": f"https://upload.wikimedia.org/thumb/{page_id}.jpg",
                "descriptionurl": f"https://commons.wikimedia.org/wiki/File:{page_id}",
                "extmetadata": {
                    "Artist": {"value": "<a href='#'>Test Author</a>"},
                    "LicenseShortName": {"value": "CC BY-SA 4.0"},
                    "LicenseUrl": {"value": "https://creativecommons.org/licenses/by-sa/4.0"},
                },
            }
        ],
    }


def _geosearch_payload(pages: list[dict]) -> dict:
    return {"query": {"pages": pages}}


def test_terrain_covers_every_cell_and_stays_normalised():
    terrain = hydrology.terrain()
    assert len(terrain) == 1887
    ranks = [hydrology.twi_rank(cell_id) for cell_id in list(terrain)[:200]]
    assert all(0.0 <= rank <= 1.0 for rank in ranks)
    assert len(set(round(rank, 3) for rank in ranks)) > 10


def test_screening_surface_is_complete_and_honest():
    dry = susceptibility.compute_surface(susceptibility.RainfallInputs(0.0, 0.0, 0.0))
    wet = susceptibility.compute_surface(susceptibility.RainfallInputs(30.0, 70.0, 150.0))

    assert dry["model"]["trained"] is False
    assert dry["model"]["validated"] is False
    assert dry["summary"]["totalCells"] == 1887
    assert sum(dry["summary"]["counts"].values()) == 1887
    assert all(0.0 <= cell["probability"] <= 1.0 for cell in dry["cells"])
    assert {cell["builtUpSource"] for cell in dry["cells"]} <= {
        "osm_landuse",
        "simulated_proxy",
    }
    # More rain must never lower the city-wide mean for a monotone screening rule.
    assert wet["summary"]["meanProbability"] > dry["summary"]["meanProbability"]
    assert wet["topCells"][0]["probability"] >= wet["cells"][-1]["probability"]


def _weather_transport() -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "api.open-meteo.com"
        return httpx.Response(
            200,
            json={
                "current": {
                    "time": "2026-11-25T18:00",
                    "temperature_2m": 25.2,
                    "relative_humidity_2m": 38,
                    "precipitation": 0.0,
                    "rain": 0.0,
                    "weather_code": 0,
                    "wind_speed_10m": 9.0,
                },
                "hourly": {
                    "time": [f"2026-11-25T{hour:02d}:00" for hour in range(24)],
                    "precipitation": [1.0] * 24,
                    "precipitation_probability": [40] * 24,
                },
                "minutely_15": {
                    "time": [f"2026-11-25T18:{minute:02d}" for minute in (0, 15, 30, 45)],
                    "precipitation": [0.2, 0.2, 0.2, 0.2],
                },
            },
        )

    return httpx.MockTransport(handler)


def test_live_weather_nowcast_from_mocked_open_meteo(client, monkeypatch):
    cache.clear()
    data = live_weather.fetch_live_weather(transport=_weather_transport())
    assert data["source"] == "open-meteo"
    assert data["provenance"] == "public_dataset"
    assert data["current"]["temperature"] == 25.2
    assert data["nowcastMm"]["next24h"] == 24.0
    assert len(data["hourly"]) == 24
    cache.clear()

    monkeypatch.setattr(
        "app.routers.live.fetch_live_weather",
        lambda: live_weather.fetch_live_weather(transport=_weather_transport()),
    )
    response = client.get("/api/v1/live/weather")
    assert response.status_code == 200
    assert response.json()["nowcastMm"]["next1h"] == 0.8


def test_nearby_photos_keep_places_and_drop_off_topic_images():
    cache.clear()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["generator"] == "geosearch"
        return httpx.Response(
            200,
            json=_geosearch_payload(
                [
                    _image(1, "File:M G Road from foot overbridge, Indore.jpg"),
                    _image(2, "File:Hortensia - Group of little flower.jpg"),
                    _image(3, "File:Rajwada Palace, Indore.jpg"),
                    _image(4, "File:Street food in Indore.jpg"),
                    _image(5, "File:Subhash Marg in Indore, India.JPG"),
                ]
            ),
        )

    result = commons.fetch_nearby_photos(
        22.7186, 75.8552, 1500, 6, transport=httpx.MockTransport(handler)
    )
    titles = [photo["title"] for photo in result["photos"]]
    assert "M G Road from foot overbridge, Indore.jpg" in titles
    assert "Rajwada Palace, Indore.jpg" in titles
    assert all("flower" not in title.lower() for title in titles)
    assert all("food" not in title.lower() for title in titles)
    assert result["scope"] == "nearby"
    assert result["photos"][0]["author"] == "Test Author"
    assert result["photos"][0]["license"] == "CC BY-SA 4.0"
    assert result["photos"][0]["pageUrl"]
    cache.clear()


def test_nearby_photos_fall_back_to_curated_city_photos():
    cache.clear()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["generator"] == "geosearch"
        return httpx.Response(
            200,
            json=_geosearch_payload([_image(9, "File:Hortensia - Group of little flower.jpg")]),
        )

    result = commons.fetch_nearby_photos(
        22.768, 75.879, 1500, 6, transport=httpx.MockTransport(handler)
    )
    assert result["scope"] == "city"
    assert len(result["photos"]) == 6
    assert "not photos of this exact location" in result["note"]
    assert all(photo["pageUrl"].startswith("https://commons.wikimedia.org/") for photo in result["photos"])
    cache.clear()


def test_city_works_returns_sourced_projects(client):
    response = client.get("/api/v1/city/works")
    assert response.status_code == 200
    body = response.json()

    assert body["provenance"] == "public_dataset"
    assert body["asOf"] == "2026-11-25"
    assert len(body["projects"]) == 4
    assert body["siteCount"] == len(body["sites"])

    airport = next(item for item in body["projects"] if item["id"] == "indore-metro-airport-extension")
    # A completion date is only shown when a cited source states one.
    assert airport["expectedCompletion"] is None
    assert airport["sourceUrl"].startswith("https://")
    assert all(project["sourceUrl"].startswith("https://") for project in body["projects"])
