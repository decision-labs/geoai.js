[![Main](https://github.com/decision-labs/geobase.js/actions/workflows/main.yml/badge.svg)](https://github.com/decision-labs/geobase.js/actions/workflows/main.yml)

# `@geobase.js/geoai`

A Javascript library for running Geo AI models in frontend applications.

## Installation

```bash
npm install @geobase.js/geoai
```

## Usage

### Core Library (Node.js and Browser)

```javascript
import { geoai } from "@geobase.js/geoai";

// Initialize the pipeline
const pipeline = await geoai.pipeline([{ task: "object-detection" }], {
  provider: "geobase",
  apikey: "your-api-key",
});

// Run inference
const result = await pipeline.inference({
  inputs: {
    polygon: geoJsonFeature,
  },
  mapSourceParams: {
    zoomLevel: 18,
  },
});
```

## Architecture

- **Core Module** (`@geobase.js/geoai`): Pure Javascript/TypeScript library that works in both Node.js and browser environments

## API Reference

### Core API

- `geoai.pipeline(tasks, config)` - Initialize a pipeline with tasks
- `pipeline.inference(params)` - Run inference with the pipeline


## Supported Tasks

- Object Detection
- Building Footprint Segmentation
- Land Cover Classification
- Zero-shot Object Detection
- Oriented Object Detection
- Oil Storage Tank Detection
- Ship Detection
- Solar Panel Detection
- Wetland Segmentation
- Mask Generation
- Car-Detection

## License

MIT

~~togglebuild~~
