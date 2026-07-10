# TMS Quickstart

Minimal [GeoAI.js](https://github.com/decision-labs/geoai.js) example that runs detection against **any XYZ/TMS tile URL** using `provider: "tms"`.

- MapLibre map with draw tools
- Default tile source: **ESRI World Imagery** satellite (no API key)
- Swap in your own image or raster tile server, gdal2tiles, or static tile pyramid URL
- Tasks: building detection, car detection, object detection

## Quick start

From the **repo root**, build GeoAI.js first (this example uses the local `build/` output with TMS support):

```bash
pnpm build
cd examples/05-tms-quickstart
cp .env.example .env.local   # optional — ESRI satellite works out of the box
pnpm install
pnpm dev
```

Open http://localhost:3000, wait for the model to load, draw a polygon over visible features, and release to run inference.

Install peer dependencies if prompted:

```bash
pnpm add @huggingface/transformers onnxruntime-web
```

## Use your own tiles

Set `VITE_TMS_BASE_URL` in `.env.local` or paste a template in the sidebar and click **Apply tile source**.

### ESRI World Imagery (default)

```bash
VITE_TMS_BASE_URL=https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
VITE_TMS_SCHEME=WebMercator
VITE_MAP_CENTER=12.482,41.885
VITE_INFERENCE_ZOOM=17
```

ESRI tile paths use `{z}/{y}/{x}` order (Y before X). The sidebar preset handles this automatically.

### Image or raster tile server (COG)

```bash
VITE_TMS_BASE_URL=https://your-raster-tiles.example.com/tiles/WebMercatorQuad/{z}/{x}/{y}?url=https%3A%2F%2Fyour-bucket%2Fimagery.tif
VITE_MAP_CENTER=-121.74,38.54
VITE_INFERENCE_ZOOM=18
```

### gdal2tiles static pyramid

```bash
VITE_TMS_BASE_URL=https://your-host.example.com/tiles/{z}/{x}/{y}.png
VITE_MAP_CENTER=-121.74,38.54
VITE_INFERENCE_ZOOM=17
```

## How it works

1. `buildTmsConfig()` reads env vars and builds `TmsParams` for `geoai.pipeline()`.
2. MapLibre raster tiles use the **same** `baseUrl` as GeoAI so the map and inference stay aligned.
3. On polygon draw, `pipeline.inference()` fetches TMS tiles for the AOI and runs the selected task.

See also: [TMS provider docs](https://docs.geobase.app/geoai/map-providers/tms) and [Serving raster tiles from imagery](https://docs.geobase.app/geoai/map-providers/serving-raster-tiles).

## Local library development

This example depends on `file:../../build` so it picks up the TMS provider from your local checkout. After changing library code:

```bash
# repo root
pnpm build

# this example (reinstall if build output changed materially)
pnpm install
pnpm dev
```

When TMS ships in a published `geoai` release, you can switch `package.json` to `geoai@<version>` instead of the file reference.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server on port 3000 |
| `pnpm build` | Typecheck and production build |
| `pnpm preview` | Preview production build |
| `pnpm type-check` | TypeScript only |
