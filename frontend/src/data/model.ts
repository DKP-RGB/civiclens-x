import type { ModelInfo } from '@/types'

export const MODEL_INFO: ModelInfo = {
  name: 'Waterlogging risk - prototype scorer',
  version: '0.1.0-prototype',
  algorithm: 'Transparent logistic scoring (XGBoost planned for Phase 5)',
  status: 'Frontend prototype - no trained ML model yet',
  horizonHours: 24,
  trainedAt: null,
  metrics: {
    precision: null,
    recall: null,
    f1: null,
    prAuc: null,
  },
  dataSources: [
    {
      label: 'Indore City boundary',
      provenance: 'public_dataset',
      note: 'OpenStreetMap relation 16636427, ODbL 1.0. Not an official municipal notification boundary.',
    },
    {
      label: 'Elevation & slope',
      provenance: 'public_dataset',
      note: 'Copernicus DEM GLO-90 sampled through the free Open-Meteo Elevation API; slope derived at 250 m.',
    },
    {
      label: 'Road density & drainage proximity',
      provenance: 'public_dataset',
      note: 'OpenStreetMap major roads and mapped waterways. Municipal stormwater drain records are not available.',
    },
    {
      label: 'Historical incidents',
      provenance: 'simulated',
      note: 'Synthetic incident records used to exercise the pipeline. They are not real Indore complaints.',
    },
    {
      label: 'Rainfall scenario in this view',
      provenance: 'simulated',
      note: 'Demo monsoon spell (12/30/105 mm). The scorer has not been switched to live rainfall yet.',
    },
    {
      label: 'Rainfall observations & forecast (backend)',
      provenance: 'public_dataset',
      note: 'Open-Meteo ERA5 archive and 7-day forecast for Indore, ingested by the backend CLI. Not yet used by this view.',
    },
    {
      label: 'Impervious-surface proxy in this view',
      provenance: 'simulated',
      note: 'Built-up proxy derived from distance to centre and road density. The scorer does not consume the land-use layer yet.',
    },
    {
      label: 'Land-use shares (backend)',
      provenance: 'public_dataset',
      note: 'OpenStreetMap landuse polygons sampled per 250 m cell into built-up, green and water shares. Ingested on demand; not yet used by this view.',
    },
  ],
  disclaimer:
    'Prototype only. Risk values are illustrative and must not be used for operational decisions. The Phase 5 XGBoost model will be trained, calibrated and validated on Indore-relevant data before any accuracy claim is made.',
}

export const MODEL_METRIC_ROWS = [
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1', label: 'F1 score' },
  { key: 'prAuc', label: 'PR-AUC' },
] as const
