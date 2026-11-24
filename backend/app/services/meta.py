"""Static metadata: model card, data provenance and disclaimers."""

from __future__ import annotations

from app.core.config import get_settings
from app.geospatial.dataset import grid_meta, localities

MODEL_INFO = {
    "name": "Waterlogging risk - prototype scorer",
    "version": "0.1.0-prototype",
    "algorithm": "Transparent logistic scoring (XGBoost planned for Phase 5)",
    "status": "API prototype - no trained ML model yet",
    "horizonHours": 24,
    "trainedAt": None,
    "metrics": {"precision": None, "recall": None, "f1": None, "prAuc": None},
}

DATA_SOURCES = [
    {
        "label": "Indore City boundary",
        "provenance": "public_dataset",
        "note": "OpenStreetMap relation 16636427, ODbL 1.0. Not an official municipal notification boundary.",
    },
    {
        "label": "Elevation & slope",
        "provenance": "public_dataset",
        "note": "Copernicus DEM GLO-90 sampled through the free Open-Meteo Elevation API; slope derived at 250 m.",
    },
    {
        "label": "Road density & drainage proximity",
        "provenance": "public_dataset",
        "note": "OpenStreetMap major roads and mapped waterways. Municipal stormwater drain records are not available.",
    },
    {
        "label": "Historical incidents",
        "provenance": "simulated",
        "note": "Synthetic incident records used to exercise the pipeline. They are not real Indore complaints.",
    },
    {
        "label": "Rainfall observations & forecast",
        "provenance": "public_dataset",
        "note": "Open-Meteo ERA5 archive and 7-day forecast for Indore, stored by the ingestion CLI. Real public data, not yet wired into the risk scorer.",
    },
    {
        "label": "Risk scenario rainfall",
        "provenance": "simulated",
        "note": "Demo monsoon scenario (12 mm/h, 30 mm/3 h, 105 mm/24 h) still used by the illustrative scorer until the Phase 5 model switch.",
    },
    {
        "label": "Impervious surface (OSM landuse)",
        "provenance": "public_dataset",
        "note": "OpenStreetMap landuse polygons sampled per 250 m cell to estimate built-up, green and water shares. Ingested on demand via the CLI.",
    },
    {
        "label": "Built-up proxy in the scorer",
        "provenance": "simulated",
        "note": "The risk scorer still uses a distance-to-centre and road-density proxy rather than the ingested landuse shares.",
    },
]

DISCLAIMERS = [
    "Prototype only. Risk values are illustrative and must not be used for operational decisions.",
    "No precision, recall or PR-AUC is claimed until a model is trained and validated on Indore data.",
    "Seeded complaints, incidents, population and asset records are simulated.",
    "Ingested weather and landuse rows are real public data, but the risk scorer still runs on a demo rainfall scenario and a built-up proxy.",
]

MODEL_DISCLAIMER = (
    "Prototype only. Risk values are illustrative and must not be used for operational "
    "decisions. The Phase 5 XGBoost model will be trained, calibrated and validated on "
    "Indore-relevant data before any accuracy claim is made."
)


def model_info() -> dict:
    settings = get_settings()
    return {
        **MODEL_INFO,
        "version": settings.model_version,
        "dataSources": DATA_SOURCES,
        "disclaimer": MODEL_DISCLAIMER,
    }


def meta_payload() -> dict:
    settings = get_settings()
    return {
        "app": settings.app_name,
        "phase": "4 - public data ingestion (frontend still runs on bundled data)",
        "city": "Indore",
        "grid": grid_meta(),
        "model": model_info(),
        "localities": localities(),
        "provenance": DATA_SOURCES,
        "disclaimers": DISCLAIMERS,
    }
