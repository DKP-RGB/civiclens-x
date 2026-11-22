# CivicLens X

**Predictive urban intelligence for Indore, Madhya Pradesh.**

CivicLens X is a two-portal prototype: citizens report and follow civic issues, while
authorities see a forward-looking risk surface for waterlogging and road deterioration,
inspect why each 250 m cell scores the way it does, simulate rainfall scenarios and run a
preventive action queue.

The project is deliberately scoped to **Indore only**. It does not make predictions for any
other city.

> **Status: Phase 2 complete (frontend), Phase 3 in progress (API).** All pages run on
> bundled data. A FastAPI backend now persists complaints and serves the same illustrative
> risk scores, but the frontend is not wired to it yet. There is no trained ML model.
> Every screen states which numbers are real public data, which are simulated, and which
> are illustrative model output.

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
| Weather scenario | Simulated | A demo monsoon spell, not a live forecast |
| Incidents | Simulated | 316 synthetic reports for demonstration |
| Population estimates | Simulated | Illustrative only, not census figures |
| Impervious-surface proxy | Simulated | Not derived from a land-cover product |
| Municipal asset register | Simulated | No verified IMC inventory is connected |
| Risk scores | Model output | An illustrative logistic scorer, **not** a trained ML model |
| Complaints, actions | Seeded demo data | Stored in the browser; nothing is sent to IMC |
| Explanations | Rule-based text | Gemini integration arrives with the backend |

**No accuracy metrics are claimed.** Precision, recall, PR-AUC and similar numbers appear as
"Not available" until a model is actually trained and validated.

---

## Portals

### Citizen (`/citizen`)
- Dashboard with local risk, weather and open complaints
- Report an issue with photo upload, category, map-based location and description
- My complaints with status timeline and the ability to add information
- Locality risk explorer with cell-level factor breakdowns and AI-style explanations

### Authority (`/authority`)
- Intelligence dashboard: city risk surface, distribution, rain, localities, priority cells
- Future risk map: horizon, risk type, layer toggles, locality focus
- Prediction explorer: cell score, drivers, uncertainty, model card, data sources
- Infrastructure intelligence: simulated asset register joined to the risk grid
- What-if simulator: rainfall, duration, drainage condition, impervious cover, delta map
- Preventive action centre: rule-based, department-owned work queue
- Complaint management with status and priority editing

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

### 2. Backend (Phase 3)

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

The frontend reads `VITE_API_BASE_URL` but does not call the API yet; integration
is a later phase.

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
| GET | `/api/v1/risk/cells/{cell_id}` | Single cell with factors |
| POST | `/api/v1/risk/simulate` | Re-score under a what-if scenario |

Responses use camelCase to match the frontend domain types. Risk scores from the
API are numerically identical to the frontend scorer for the same inputs.

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
PostgreSQL/PostGIS instead. The frontend still serves its bundled data in Phase 3;
the container wiring is ready for the Phase 7 integration.

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

---

## The risk engine

`frontend/src/lib/risk.ts` contains an **illustrative logistic scorer**. It combines elevation,
slope, distance to the nearest mapped waterway, an impervious-surface proxy, rainfall intensity
and a repeat-incident term into a 0–1 score, then classifies it as low, moderate, high or
critical.

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
| 4 | Real public-data ingestion and storage | Planned |
| 5 | Model training, validation, honest metrics | Planned |
| 6 | Gemini explanations with fallback | Planned |
| 7 | Frontend integration, testing, deployment | Planned |
| 8 | Documentation and demo | Planned |

The frontend still runs on its bundled data. Phase 7 switches it to the API.

---

## Known limitations

- Weather is a simulated scenario; there is no live forecast feed yet.
- Incidents, population, assets and complaints are synthetic demo data.
- Risk scores are illustrative and must not inform real operational decisions.
- The frontend still runs on bundled data; it does not call the API yet (Phase 7).
- Preventive actions remain frontend-only until the model and optimiser exist.
- The basemap requires network access to OpenFreeMap; the risk grid still renders without it.
- Browser storage means complaints and status changes do not leave the device in the current frontend.
- The JavaScript bundle is large because MapLibre and Recharts are loaded eagerly; code
  splitting is a later optimisation.

---

## Attribution

- Boundary, roads and waterways: © OpenStreetMap contributors, ODbL.
- Elevation: Copernicus DEM GLO-90, via Open-Meteo.
- Basemap tiles and styles: OpenFreeMap, © OpenStreetMap contributors.

## License

Prototype for demonstration and evaluation. Add a license before any public distribution.
