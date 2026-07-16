---
name: geoai
description: >-
  Build browser geospatial AI apps with the geoai npm package (GeoAI.js).
  Use when integrating object detection, segmentation, classification, or
  feature extraction on satellite/aerial imagery; choosing a geoai task or
  map provider (esri, geobase, mapbox, tms, wms); wiring geoai.pipeline /
  inference; web workers for background inference; or React + MapLibre
  patterns. Triggers include geoai, GeoAI.js, geobase AI, satellite detection,
  building footprints, DINOv3 embeddings, web worker, Worker API.
---

# GeoAI.js

JavaScript/TypeScript library for running geospatial AI models in the browser
(and Node). Imagery comes from map providers; inference runs via ONNX /
Transformers.js.

## Install

```bash
npm i geoai @huggingface/transformers onnxruntime-web
```

Peer deps are required. Package: [`geoai`](https://www.npmjs.com/package/geoai).
Docs: https://docs.geobase.app/geoai — LLM index: https://docs.geobase.app/geoai/llms.txt

## Core API

```typescript
import { geoai } from 'geoai';

const pipeline = await geoai.pipeline(
  [{ task: 'object-detection' /* modelId?, modelParams? */ }],
  { provider: 'esri' } // see providers.md
);

const result = await pipeline.inference({
  inputs: { polygon: geoJsonPolygonFeature }, // GeoJSON Feature<Polygon>, required
  mapSourceParams: { zoomLevel: 18 }, // optional
  postProcessingParams: { confidence: 0.5 }, // task-specific, optional
});
```

- `geoai.pipeline(tasks, providerParams)` — one task or a chainable sequence.
- `pipeline.inference(params)` — returns detections / masks / features (task-dependent).
- `geoai.models()` — list registered tasks and metadata.

Polygon must be a **GeoJSON Feature** with `Polygon` geometry (not a bare geometry).

### Zero-shot inputs

```typescript
await pipeline.inference({
  inputs: {
    polygon: feature,
    classLabel: 'aircraft.wind turbine', // dot-separated classes
  },
  postProcessingParams: { threshold: 0.2, topk: 10 },
});
```

## Task picker

Prefer specialized tasks over generic ones when they match.

| Need | Task id |
|------|---------|
| Cars / small vehicles | `car-detection` |
| Ships | `ship-detection` |
| Buildings (boxes) | `building-detection` |
| Building outlines | `building-footprint-segmentation` |
| Solar panels | `solar-panel-detection` |
| Oil tanks | `oil-storage-tank-detection` |
| Wetlands / water bodies | `wetland-segmentation` |
| Land use classes | `land-cover-classification` |
| Fixed classes (vehicle, person, building, boat, …) | `object-detection` |
| Rotated boxes | `oriented-object-detection` |
| Custom text labels | `zero-shot-object-detection` |
| Contiguous regions (fields, lakes, roads) | `mask-generation` |
| DINOv3 embeddings / similarity | `image-feature-extraction` |

Full task notes, defaults, and chain rules: [tasks.md](tasks.md).

## Providers

| Provider | Auth | Use when |
|----------|------|----------|
| `esri` | None | Quick demos, global imagery |
| `mapbox` | API key | Mapbox satellite |
| `geobase` | projectRef + apikey + COG URL | Your own COG imagery |
| `tms` | Optional | Any `{z}/{x}/{y}` raster tiles |
| `wms` | Usually none | OGC GetMap endpoints |

Configs: [providers.md](providers.md).

## Background inference (Workers)

For UI apps, run the pipeline in a **Web Worker** so inference stays off the
main thread. Vanilla JS and React patterns: [workers.md](workers.md).

## React / MapLibre

There is **no** `geoai/react` export. Use the worker + hook pattern in
[react.md](react.md) (builds on [workers.md](workers.md)).

## Agent checklist

1. Install `geoai` + peer dependencies.
2. Pick the most specific task id from the table above.
3. Configure a provider (start with `esri` if no credentials).
4. Pass a GeoJSON polygon Feature covering the AOI.
5. For UI apps, use a Worker so the main thread stays responsive ([workers.md](workers.md)).
6. Read task docs for post-processing knobs before inventing params.

## References

- [tasks.md](tasks.md) — registry tasks, models, chaining
- [providers.md](providers.md) — provider param shapes
- [workers.md](workers.md) — Web Worker API (vanilla JS + protocol)
- [react.md](react.md) — React hook + MapLibre UX
- Human docs: https://docs.geobase.app/geoai
- Live demos: https://docs.geobase.app/geoai-live
- Full LLM corpus: https://docs.geobase.app/geoai/llms-full.txt
