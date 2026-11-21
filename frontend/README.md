# CivicLens X — frontend

Vite + React + TypeScript + Tailwind frontend for CivicLens X. See the
[project README](../README.md) for scope, data provenance, architecture and the
full phase roadmap.

## Commands

```bash
npm install
npm run dev       # http://localhost:5173/
npm run build     # type-check + production build
npm run preview   # serve the production build
npm run lint      # oxlint
```

## Environment

Copy `.env.example` to `.env` if you need to override defaults. All values are
optional; the map styles are keyless OpenFreeMap endpoints and the app runs on
bundled data with no backend.

| Variable | Purpose |
| --- | --- |
| `VITE_APP_NAME` | Display name |
| `VITE_API_BASE_URL` | FastAPI base URL (unused until Phase 3) |
| `VITE_MAP_STYLE_DARK` | Dark basemap style URL |
| `VITE_MAP_STYLE_LIGHT` | Light basemap style URL |

## Structure

- `src/pages` — landing, citizen and authority screens
- `src/components` — UI primitives, map, charts and domain widgets
- `src/data` — generated grid and bundled demo datasets
- `src/lib` — risk engine, explanations, status metadata, utilities
- `src/store` — localStorage-backed app state
- `public/data` — boundary GeoJSON served at runtime
