# CivicLens X

**Predictive urban intelligence for Indore, Madhya Pradesh.**

CivicLens X is a two-portal prototype: citizens report and follow civic issues, while
authorities see a forward-looking risk surface for waterlogging and road deterioration,
inspect why each 250 m cell scores the way it does, simulate rainfall scenarios and run a
preventive action queue.

The project is deliberately scoped to **Indore only**. It does not make predictions for any
other city.

> **Status: Phase 4 complete, plus a live city layer.** The frontend runs on bundled data
> except the new live pages. A FastAPI backend persists complaints, serves the illustrative
> risk scores, and ingests real Open-Meteo rainfall and OSM landuse with provenance.
>
> New in this pass:
> - `/city` — a graphics-first live page: current Indore weather, a 24 h rain forecast, the
>   live terrain-wetness surface, sourced city projects, mapped OSM construction and real
>   licensed photographs.
> - `GET /api/v1/live/weather` — live Open-Meteo `current` + 15-minute nowcast.
> - `GET /api/v1/risk/surface` — the `hydro-screening-0.2` terrain-wetness index, computed
>   from the real DEM, OSM land use and live rain.
> - `GET /api/v1/media/nearby` — real Wikimedia Commons photos with author and licence.
> - `GET /api/v1/city/works` — sourced projects plus live OSM construction features.
>
> There is still **no trained ML model**. The new index is physically based, not trained or
> validated, because no verified Indore waterlogging labels exist. Every screen says so.

---

## What is real and what is simulated

Honesty about data provenance is a core requirement of this project, so the UI labels each
layer. The same table is summarised below.

| Layer | Provenance | Source / note |
| --- | --- | --- |
| City boundary | Public dataset | OpenStreetMap relation `16636427`, via Overpass API |
| 250 m analysis grid (1,887 cells) | Derived | Generated from the OSM boundary |
| Elevation, slope | Public dataset | Copernicus DEM GLO-90 sampled through Open-Meteo |
| Major roads, waterways | Public dataset | OpenStreetMap via Overpass API |
| Basemap tiles | Public dataset | OpenFreeMap (keyless), OpenStreetMap contributors |
| Rainfall observations | Public dataset | Open-Meteo ERA5 archive (30 days, ingested) |
| Rainfall forecast | Public dataset | Open-Meteo 7-day daily forecast (ingested) |
| Live weather and 24 h rain | Public dataset | Open-Meteo `current` + `minutely_15` + `hourly`, cached 5 min |
| Weather scenario in the prototype scorer | Simulated | A demo monsoon spell, not a live forecast |
| Incidents | Simulated | 316 synthetic reports for demonstration |
| Population estimates | Simulated | Illustrative only, not census figures |
| Land-use shares | Public dataset | OSM `landuse` polygons sampled per 250 m cell (ingested) |
| Terrain wetness (TWI) | Derived | D8 flow accumulation on the real Copernicus DEM |
| Impervious-surface proxy in the prototype scorer | Simulated | Still uses distance-to-centre + road density |
| Municipal asset register | Simulated | No verified IMC inventory is connected |
| Prototype risk scores | Model output | An illustrative logistic scorer, **not** a trained ML model |
| `/city` risk surface | Model output | `hydro-screening-0.2`, physically based, `trained: false`, `validated: false` |
| City project dates | Public dataset | Only where a cited source states a date; otherwise blank |
| Mapped construction sites | Public dataset | Live OSM `construction` features (may lag reality) |
| Nearby photographs | Public dataset | Wikimedia Commons geosearch, with per-image author and licence |
| Complaints, actions | Seeded demo data | Stored in the browser; nothing is sent to IMC |
| Explanations | Rule-based text | Gemini integration arrives with the backend |

**No accuracy metrics are claimed.** Precision, recall, PR-AUC and similar numbers appear as
"Not available" until a model is actually trained and validated.

---

## Portals

### Live city pulse (`/city`)
- Current Indore temperature, condition, humidity, wind and rain, straight from Open-Meteo
- 24 h rainfall bars, with an explicit "no rain expected" state on dry days
- Live terrain-wetness surface: mean risk, critical/high counts and top hotspots
- Sourced city projects (metro, Ring Road) with the citation and "as of" date
- Mapped OSM construction features, when the Overpass import succeeds
- Real Indore photographs from Wikimedia Commons, with author and licence on every image

### Citizen (`/citizen`)
- Dashboard with local risk, weather and open complaints
- Report an issue with photo upload, category, map-based location and description
- My complaints with status timeline and the ability to add information
- Locality risk explorer with cell-level factor breakdowns and AI-style explanations

### Authority (`/authority`)
- Intelligence dashboard: city risk surface, distribution, rain, localities, priority cells;
  headline stats and the priority queue come from the API when it is reachable, otherwise
  the numerically identical bundled scorer is used
- Future risk map: horizon, risk type, layer toggles, locality focus
- Prediction explorer: cell score, drivers, uncertainty, model card, data sources
- Infrastructure intelligence: simulated asset register joined to the risk grid
- What-if simulator: rainfall, duration, drainage condition, impervious cover, delta map
- Preventive action centre: rule-based, department-owned work queue
- Complaint management with status and priority editing
- Data health: real ingestion status, forecast, land-use coverage and provenance

The landing page at `/` is a simple portal selector. There is no authentication; roles are
chosen, not verified.

---

## Tech stack

**Frontend (implemented)**
- Vite 8, React 19, TypeScript 7
- Tailwind CSS 3.4 with hand-written shadcn-style primitives
- MapLibre GL 6 + OpenFreeMap keyless styles
- Recharts 3, React Router 7, Lucide icons
- Local state store persisted to `localStorage`

**Backend (Phase 3)**
- Python 3.12, FastAPI, SQLAlchemy 2, Pydantic v2
- SQLite by default; PostgreSQL/PostGIS via `DATABASE_URL`
- Complaint persistence with a five-stage timeline and citizen notes
- Risk API that ports the frontend scorer for score parity
- Photo uploads from base64 data URLs, served from `/uploads`
- Gemini free tier arrives in Phase 6 with a rule-based fallback

---

## Repository layout

```
civiclens-x/
├─ frontend/            Vite + React application
│  ├─ public/data/      Boundary GeoJSON served at runtime
│  └─ src/
│     ├─ components/    UI primitives, map, charts, domain widgets
│     ├─ data/          Generated grid, incidents, localities, weather, model metadata
│     ├─ lib/           Risk engine, explanations, status metadata, utilities
│     ├─ pages/         Landing, citizen and authority pages
│     ├─ store/         localStorage-backed app store
│     └─ types/         Shared domain types
├─ backend/             FastAPI API, SQLite/PostgreSQL persistence, tests
├─ scripts/             Node data pipeline (boundary, grid, elevation, build)
├─ data/                Raw / interim / processed / cache (git-ignored)
├─ notebooks/           Analysis scratch space
└─ docs/                Design and data notes
```

---

## Getting started

### Requirements
- Node.js 20+ (tested on Node 22)
- Python 3.11+ for the backend phase
- A modern browser with WebGL for the maps

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173/>.

```bash
npm run build     # type-check + production build
npm run preview   # serve the production build
npm run lint      # oxlint
```

On Windows you can also run `setup.bat` once and then `start.bat`.

### 2. Backend (Phase 4)

```bash
cd backend
python -m venv .venv                  # already created in this workspace
.venv\Scripts\activate                # Windows
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Open <http://127.0.0.1:8000/docs> for the interactive API. On first start the
backend creates the SQLite database and seeds the same 24 demo complaints the
frontend ships.

Run the checks:

```bash
python -m pytest
python -m ruff check app tests
```

The frontend reads `VITE_API_BASE_URL`. `/city`, the landing snapshot, the authority overview
summary and the Data health page call the API; the other risk screens still use bundled data.

### API overview

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/health/ready` | Database readiness |
| GET | `/api/v1/meta` | Model card, grid info, provenance, disclaimers |
| GET | `/api/v1/localities` | 20 Indore localities |
| GET | `/api/v1/grid` | 1,887 grid cells + metadata |
| GET | `/api/v1/incidents` | Simulated incidents, filterable |
| GET | `/api/v1/complaints` | List with status/priority/category/search filters |
| POST | `/api/v1/complaints` | Create a complaint, link its cell, save an optional photo |
| GET | `/api/v1/complaints/{id}` | Complaint with timeline |
| PATCH | `/api/v1/complaints/{id}` | Update status/priority and append a timeline event |
| POST | `/api/v1/complaints/{id}/notes` | Add information to the timeline |
| GET | `/api/v1/risk` | Full risk surface for a category and rainfall inputs |
| GET | `/api/v1/risk/summary` | Compact summary + top 10 cells |
| GET | `/api/v1/risk/surface` | `hydro-screening-0.2` surface, live rain by default |
| GET | `/api/v1/risk/cells/{cell_id}` | Single cell with factors |
| POST | `/api/v1/risk/simulate` | Re-score under a what-if scenario |
| GET | `/api/v1/live/weather` | Live current conditions + 1/3/24 h nowcast |
| GET | `/api/v1/media/nearby` | Licensed Commons photos near a point |
| GET | `/api/v1/city/works` | Sourced projects + mapped OSM construction |
| GET | `/api/v1/weather/daily` | Ingested daily observations, oldest first |
| GET | `/api/v1/weather/forecast` | Ingested 7-day forecast + staleness flag |
| GET | `/api/v1/ingestion/runs` | Provenance for every import attempt |
| GET | `/api/v1/ingestion/features/summary` | Per-cell land-use coverage summary |
| GET | `/api/v1/ingestion/features/{cell_id}` | Built-up / green / water shares for one cell |

Responses use camelCase to match the frontend domain types. Risk scores from the
API are numerically identical to the frontend scorer for the same inputs.

### Ingesting public data

Imports are manual, keyless and recorded, because Open-Meteo and Overpass are
free community services rather than paid APIs. Nothing runs at API startup.

```bash
cd backend
.venv\Scripts\activate
python -m app.ingestion.cli weather    # archive (30 d) + 7-day forecast
python -m app.ingestion.cli landuse    # OSM landuse polygons -> cell shares
python -m app.ingestion.cli works      # OSM construction sites -> city page
python -m app.ingestion.cli all
```

The last successful run per source is written to `ingestion_runs`. Weather rows
land in `weather_daily` / `weather_forecast`; land-use shares in
`cell_features`; construction features in `construction_sites`. A failed run is
stored with its HTTP error instead of being silently dropped, and the forecast
endpoint reports `stale: true` when the newest success is older than
`FORECAST_STALE_HOURS` (default 12).

Open-Meteo needs no key and typically answers in 1-2 s. Overpass needs a real
`User-Agent` (configured via `USER_AGENT`) and can take 30-120 s for Indore; it
returns 502 when at capacity, so the client tries three public mirrors. An empty
answer is treated as a failure so a busy server cannot silently wipe the stored
construction layer. Overpass outages are common, so the city page degrades to
"no sites stored yet" rather than failing.

The ingested weather and land-use layers are consumed by the new
`/risk/surface` index. The older `/risk`, `/risk/summary` and `/risk/simulate`
endpoints still use the bundled prototype scorer.

### 3. Environment

Copy the templates and fill in local values. Never commit `.env` files.

```
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

The Gemini key is optional. Leave it blank to run on fallback text.

### 4. Docker (optional)

```bash
docker compose up --build
```

- Frontend: <http://localhost:8080/>
- API docs: <http://localhost:8000/docs>

The stack runs the frontend behind nginx and the API on SQLite inside a named
volume (`civiclens-data`). Override `DATABASE_URL` in `docker-compose.yml` to use
PostgreSQL/PostGIS instead. The risk screens still serve bundled data until the Phase 7
integration; the authority overview summary and Data health page call the API.

---

## Data pipeline

The committed frontend data is generated by scripts in `scripts/`. To rebuild it:

```bash
# 1. OSM city boundary (relation 16636427)
node scripts/extract_boundary.mjs

# 2. 250 m grid clipped to the boundary
node scripts/generate_grid.mjs

# 3. Elevation samples via Open-Meteo (cached in data/cache)
node scripts/fetch_elevation.mjs

# 4. Emit typed frontend data
node scripts/build_frontend_data.mjs

# 5. Export plain JSON for the FastAPI backend
node scripts/export_backend_data.mjs
```

Raw downloads, caches and intermediate files live under `data/` and are git-ignored.
The backend JSON in `backend/app/data/` is generated and committed so the API can
start without re-running the pipeline.

Phase 4 adds a separate, at-runtime import path for layers that change daily:

```bash
cd backend
python -m app.ingestion.cli weather   # Open-Meteo archive + forecast
python -m app.ingestion.cli landuse   # OSM landuse -> cell features
```

These writes go to the database, not to the committed JSON, so they can be
refreshed without rebuilding the frontend bundle.

---

## The risk engine

There are two scorers, deliberately separated.

### `hydro-screening-0.2` — used by `/city` and the landing snapshot

`backend/app/services/susceptibility.py` scores every cell from:

- **terrain wetness**: D8 flow direction and flow accumulation over the real Copernicus
  DEM, converted to a topographic wetness index (`ln(a / tan β)`) in
  `app/services/hydrology.py`;
- **real built-up share** from ingested OSM landuse where available, otherwise the bundled
  proxy (the response labels which one was used);
- **drainage proximity** from mapped OSM waterways;
- **road density** from OSM major roads;
- **live rainfall** from the Open-Meteo nowcast (1 h / 3 h / 24 h).

The weights follow standard wetness and flash-flood screening practice. The model card
reports `trained: false` and `validated: false`: there are no verified Indore waterlogging
labels to train or validate against. It is a physical screening index, not a prediction
with a measured accuracy.

### Prototype logistic scorer — used by the older risk screens

`frontend/src/lib/risk.ts` and its Python port `backend/app/services/risk.py` contain an
**illustrative logistic scorer**. It combines elevation, slope, distance to the nearest
mapped waterway, an impervious-surface proxy, rainfall intensity and a repeat-incident term
into a 0–1 score, then classifies it as low, moderate, high or critical.

It is a transparent placeholder that lets the UI be built and tested. It is **not** XGBoost,
not trained on labels, and not validated. The `CellRisk` shape is designed so a real model can
replace the scorer later without touching page components.

The simulator re-scores the same formula under different rainfall, drainage and imperviousness
assumptions. It is a sensitivity tool, not a forecast.

---

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Foundation, data pipeline, project structure | Done |
| 2 | Complete frontend on mock data | **Done** |
| 3 | FastAPI backend, database, complaint persistence | **Done** |
| 4 | Real public-data ingestion and storage | **Done** |
| 5 | Model training, validation, honest metrics | **Blocked** — no verified Indore labels |
| 6 | Gemini explanations with fallback | Planned |
| 7 | Frontend integration, testing, deployment | In progress |
| 8 | Documentation and demo | Planned |

Phase 5 cannot start honestly: there is no open, verified Indore waterlogging label set to
train or validate against. Training on the synthetic incidents would produce meaningless
metrics, so the project ships a physically based screening index instead and labels it as
such.

`/city` and the landing snapshot now read the live API. The remaining risk screens still use
bundled data; switching them is the next integration step.

---

## Known limitations

- There are **no verified Indore waterlogging labels**, so no trained model and no accuracy
  metrics exist. `hydro-screening-0.2` is physically based and unvalidated.
- The older risk screens still use a demo rainfall scenario and a built-up proxy; the live
  model is exposed at `/risk/surface` and used by `/city` and the landing snapshot.
- OSM landuse coverage is partial: about 46% of cells contain a mapped landuse polygon, so
  the remaining cells fall back to the bundled built-up proxy and say so.
- Overpass is intermittently at capacity (HTTP 502). The construction import can fail for
  hours; the city page then shows zero mapped sites instead of stale data.
- Commons has **no geotagged Indore waterlogging or pothole archive**. Nearby photos are
  place photographs, clearly labelled as not a record of a specific defect. When nothing
  relevant is geotagged nearby, a small curated set of real Indore street photos is shown
  and labelled as city-wide.
- Project completion dates are shown only when a cited source states one. Several major
  works (including the metro airport extension) have no published completion date, so the
  UI leaves it blank rather than guessing.
- Incidents, population, assets and complaints are synthetic demo data.
- Preventive actions remain frontend-only until the model and optimiser exist.
- The basemap requires network access to OpenFreeMap; the risk grid still renders without it.
- Browser storage means complaints and status changes do not leave the device in the current frontend.
- The JavaScript bundle is large because MapLibre and Recharts are loaded eagerly; code
  splitting is a later optimisation.

---

## Attribution

- Boundary, roads and waterways: © OpenStreetMap contributors, ODbL.
- Landuse polygons: © OpenStreetMap contributors, ODbL (Overpass API).
- Weather observations and forecast: Open-Meteo (ERA5 reanalysis + forecast), CC-BY 4.0.
- Elevation: Copernicus DEM GLO-90, via Open-Meteo.
- Basemap tiles and styles: OpenFreeMap, © OpenStreetMap contributors.
- Photographs: Wikimedia Commons, per-image licence and author shown in the UI.
- City project dates: Press Information Bureau, Wikipedia, Free Press Journal (linked per row).

## License

Prototype for demonstration and evaluation. Add a license before any public distribution.
