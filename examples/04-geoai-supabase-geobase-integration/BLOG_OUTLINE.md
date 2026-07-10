# GeoAI + Geobase Blog Outline

## Title

Building GeoAI detection apps with Geobase, Supabase-style auth, and vector tiles

## 1) Problem

- Running detections is easy.
- Operationalizing detections (storage, querying, rendering) is the hard part.

## 2) Stack

- GeoAI.js for model inference.
- Geobase-hosted Postgres/PostGIS for storage.
- Geobase tileserver for fast vector-tile visualization.

## 3) Data model (AIDX prefix)

- Shared instance naming convention: `aidx_*` (**AI Detection Index**).
- Core objects: `aidx_sessions`, `aidx_results`, `aidx_analytics`.
- RPC helpers: `aidx_get_`*.

## 4) Save detections

- Auto-create session for authenticated user.
- Convert output geometries to DB-safe MultiPolygon.
- Persist detections + analytics for each run.

## 5) Visualize at scale with tileserver

- Render `public.aidx_results` as vector tiles.
- Style by `task_type` for quick interpretation.
- Refresh source after new writes.

## 6) Authenticated tile requests (what we changed)

- Problem: RLS policies use `auth.uid()`, but anonymous tile requests do not carry user JWT.
- Fix: add MapLibre `transformRequest` and attach `Authorization: Bearer <access_token>` for tile requests to the Geobase host.
- Token source: current Supabase/Geobase auth session (`supabase.auth.getSession()` + `onAuthStateChange`).
- Result: tileserver requests are evaluated as the logged-in user, so RLS-scoped rows can render.

## 7) Migrations and deployment

- Apply migrations via SQL editor, Supabase CLI (`db push --db-url`), or `psql`.
- Keep dev/prod migration flow explicit.

## 8) Wrap-up

- Why this pattern works for multi-tenant/shared DB setups.
- Next step: publish detections publicly via a dedicated tile-safe view when needed.

