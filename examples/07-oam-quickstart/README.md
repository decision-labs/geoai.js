# OAM Quickstart (OpenAerialMap / HOT Imagery)

Minimal [GeoAI.js](https://github.com/decision-labs/geoai.js) example that runs detection against **OpenAerialMap** imagery using `provider: "oam"`.

- MapLibre map with draw tools
- Public HOT Imagery STAC + TiTiler (no API key)
- Default AOI: Rome orthophoto with known coverage
- Modes: pinned STAC item, collection mosaic, or auto STAC search
- Tasks: building detection, car detection, object detection

Docs: [OAM provider](https://docs.geobase.app/geoai/map-providers/oam) · [HOT Imagery](https://docs.imagery.hotosm.org/)

## Quick start

From the **repo root**:

```bash
pnpm build
cd examples/07-oam-quickstart
pnpm install
pnpm add @huggingface/transformers onnxruntime-web   # peers if needed
pnpm dev
```

Open http://localhost:3002 — wait for the model to load, draw a polygon over Rome buildings/roads, and release to run inference.

## Modes

| Mode | Behavior |
|------|----------|
| **Pinned STAC item** (default) | `itemId` → item XYZ tiles for map + inference |
| **Collection mosaic** | Mosaic XYZ tiles |
| **Auto** | Map uses mosaic; inference STAC-searches the drawn AOI |

Optional env (`.env.local`):

```bash
VITE_OAM_MODE=item
VITE_OAM_ITEM_ID=67826781a07cc20001818cdb
VITE_MAP_CENTER=12.49,41.891
VITE_INFERENCE_ZOOM=16
VITE_GEOAI_TASK=building-detection
```

## Coverage note

OAM only covers areas where contributors uploaded imagery. Outside those footprints tiles may be empty — stay near the default Rome view or pick another item from [STAC search](https://api.imagery.hotosm.org/stac/search).

## Local library development

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
| `pnpm dev` | Start Vite on port 3002 |
| `pnpm build` | Typecheck and production build |
| `pnpm preview` | Preview production build |
| `pnpm type-check` | TypeScript only |
