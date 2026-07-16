# WMS Quickstart (NRW Orthophotos)

Minimal [GeoAI.js](https://github.com/decision-labs/geoai.js) example that runs detection against **OGC WMS GetMap** imagery using `provider: "wms"`.

- MapLibre map with draw tools
- MapLibre **4.7+** with native `{bbox-epsg-3857}` WMS tiles ([MapLibre WMS example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-wms-source/))
- **NRW geocoder** (Nominatim, bounded to Nordrhein-Westfalen) + map `maxBounds`
- Default imagery: **Geobasis NRW digital orthophotos** (public open data, no API key)
- Same WMS endpoint for map display and GeoAI inference
- Tasks: building detection, car detection, object detection

Data: [Digitale Orthophotos NW on Open.NRW](https://open.nrw/dataset/56fb584b-10cf-4009-a405-0bef06bb3e00) via `wms_nw_dop`.

## Quick start

From the **repo root**:

```bash
pnpm build
cd examples/06-wms-quickstart
cp .env.example .env.local   # optional — NRW orthophotos work out of the box
pnpm install
pnpm dev
```

Open http://localhost:3001 — wait for the model to load, draw a polygon over buildings or roads in Cologne, and release to run inference.

If `pnpm install` fails with `ERR_PNPM_EXOTIC_SUBDEP` / `global-mercator`, ensure `pnpm-workspace.yaml` has `blockExoticSubdeps: false` (the dep is bundled in `geoai.js`).

If you see `ERR_PNPM_IGNORED_BUILDS`, set explicit booleans under `allowBuilds` in `pnpm-workspace.yaml` (e.g. `esbuild: true`) or run `pnpm approve-builds`.

Install peer dependencies if prompted:

```bash
pnpm add @huggingface/transformers onnxruntime-web
```

## Default WMS (NRW DOP)

```bash
VITE_WMS_BASE_URL=https://www.wms.nrw.de/geobasis/wms_nw_dop
VITE_WMS_LAYERS=nw_dop_rgb
VITE_WMS_VERSION=1.3.0
VITE_WMS_CRS=EPSG:3857
VITE_MAP_CENTER=6.958,50.941
VITE_INFERENCE_ZOOM=17
```

Discover layer names via GetCapabilities:

```
https://www.wms.nrw.de/geobasis/wms_nw_dop?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0
```

> **Note:** `wms_nw_bildmittelpunkte` is metadata (image center points), not orthophoto imagery. Use `wms_nw_dop` with layer `nw_dop_rgb` for color orthophotos (`WMS_NW_DOP` alone returns NIR/grayscale).

## How it works

1. `buildWmsConfig()` reads env vars and builds `WmsParams` for `geoai.pipeline()`.
2. MapLibre loads WMS tiles inline in the map style ([add-a-wms-source](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-wms-source/)):

```ts
const map = new maplibregl.Map({
  container: 'map',
  style: buildMapStyle(config), // raster source with tiles: ['…&bbox={bbox-epsg-3857}']
  center: config.mapCenter,
  zoom: config.inferenceZoom,
});
```

NRW tile URL (WMS 1.3.0):

```
https://www.wms.nrw.de/geobasis/wms_nw_dop?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=nw_dop_rgb&STYLES=&FORMAT=image%2Fpng&WIDTH=256&HEIGHT=256&CRS=EPSG%3A3857&BBOX={bbox-epsg-3857}
```

3. On polygon draw, `pipeline.inference()` fetches WMS tiles for the AOI and runs the selected task.

See also: [WMS provider docs](https://docs.geobase.app/geoai/map-providers/wms) and issue [#153](https://github.com/decision-labs/geoai.js/issues/153).

## Local library development

This example depends on `file:../../build` so it picks up the WMS provider from your local checkout. After changing library code:

```bash
# repo root
pnpm build

# this example
pnpm install
pnpm dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server on port 3001 |
| `pnpm build` | Typecheck and production build |
| `pnpm preview` | Preview production build |
| `pnpm type-check` | TypeScript only |
