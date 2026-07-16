# GeoAI.js tasks

Task ids are exact strings passed to `geoai.pipeline([{ task }])`.
Defaults come from `src/registry.ts`.

## Specialized detection

| Task | Default model | Notes |
|------|---------------|-------|
| `car-detection` | `geobase/car-detection` | Small vehicles; dtype q8 |
| `ship-detection` | `geobase/ship-detection` | Maritime / coastal |
| `building-detection` | `geobase/building-detection` | Building boxes |
| `solar-panel-detection` | `geobase/solar-panel-detection` | Rooftop / solar farms |
| `oil-storage-tank-detection` | `geobase/oil-storage-tank-detection` | Optional `confidenceThreshold`, `nmsThreshold` |

## Segmentation / classification

| Task | Default model | Notes |
|------|---------------|-------|
| `building-footprint-segmentation` | ChangeStar ViT-B (`ChangeStarBuildingSegmentation.default_huggingface_id`) | Precise footprints; optional `confidenceThreshold`, `minArea`; pass `modelId` for lighter footprint model |
| `wetland-segmentation` | `geobase/wetland-segmentation` | Wetlands / water |
| `land-cover-classification` | `geobase/sparsemask` | Land use categories; optional `minArea`; dtype fp32 |
| `mask-generation` | `Xenova/slimsam-77-uniform` | Contiguous regions, not individual objects; optional `maxMasks` |

## Generic / foundation

| Task | Default model | Notes |
|------|---------------|-------|
| `object-detection` | `geobase/WALDO30-yolov8m-640x640` | Classes: LightVehicle, Person, Building, Utility Pole, Boat, Bike, Container, Truck, Gastank, Digger, SolarPanels, Bus |
| `oriented-object-detection` | `geobase/gghl-oriented-object-detection` | Rotated boxes; dtype q8 |
| `zero-shot-object-detection` | `onnx-community/grounding-dino-tiny-ONNX` | Requires `inputs.classLabel` (dot-separated). Prefer specialized tasks when the class is in the object-detection list |
| `image-feature-extraction` | `onnx-community/dinov3-vits16-pretrain-lvd1689m-ONNX` | DINOv3 patch features / similarity; dtype q8 |

## Chaining

Only some tasks declare `chainableTasks`. Valid chains must follow registry edges (pipeline reorders when possible):

- `object-detection` → `mask-generation`
- `zero-shot-object-detection` → `mask-generation`
- `image-feature-extraction` → `object-detection` | `mask-generation`

```typescript
const pipeline = await geoai.pipeline(
  [{ task: 'object-detection' }, { task: 'mask-generation' }],
  { provider: 'esri' }
);
```

Invalid combinations throw (`Cannot find a valid order for tasks: ...`).

## Override model

```typescript
await geoai.pipeline(
  [{
    task: 'building-footprint-segmentation',
    modelId: 'geobase/some-other-model',
    modelParams: { dtype: 'q8' },
  }],
  providerParams
);
```

## Inference shape (common)

```typescript
{
  inputs: {
    polygon: GeoJSON.Feature; // required
    classLabel?: string;      // zero-shot
    // task-specific extras allowed
  },
  postProcessingParams?: {
    confidence?: number;
    threshold?: number;
    topk?: number;
    maxMasks?: number;
    // …
  },
  mapSourceParams?: {
    zoomLevel?: number;
    bands?: number[];
    expression?: string; // e.g. NDVI
  }
}
```

Detection-style results typically expose GeoJSON under `detections` (FeatureCollection).
Confirm the task page for exact return fields.

## Docs per task

https://docs.geobase.app/geoai/supported-tasks
