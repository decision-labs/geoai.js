[![Main](https://github.com/decision-labs/geobase-ai.js/actions/workflows/main.yml/badge.svg)](https://github.com/decision-labs/geobase-ai.js/actions/workflows/main.yml)

# @geobase-js/geoai

A JavaScript library for running Geo AI models in frontend applications.

## Features

- **Multiple AI Models**: Support for various geospatial AI tasks including object detection, segmentation, and classification
- **Easy Integration**: Simple API for integrating AI models into web applications
- **TypeScript Support**: Full TypeScript definitions included
- **CDN Ready**: Available via npm, unpkg, and jsDelivr
- **Framework Agnostic**: Works with any JavaScript framework or vanilla JS

## Installation

### NPM

```bash
npm install @geobase-js/geoai
```

### Yarn

```bash
yarn add @geobase-js/geoai
```

### PNPM

```bash
pnpm add @geobase-js/geoai
```

### CDN

```html
<!-- Unpkg -->
<script src="https://unpkg.com/@geobase-js/geoai@0.0.1/dist/@geobase-js/geoai.js"></script>

<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@geobase-js/geoai@0.0.1/dist/@geobase-js/geoai.js"></script>
```

## Quick Start

```javascript
import { geoai } from "@geobase-js/geoai";

// Initialize a pipeline for object detection
const pipeline = await geoai.pipeline(
  [
    {
      task: "object-detection",
      modelId: "geobase/WALDO30_yolov8m_640x640",
    },
  ],
  {
    provider: "mapbox",
    apiKey: "your-mapbox-api-key",
  }
);

// Run inference on a polygon
const result = await pipeline.inference({
  inputs: {
    polygon: {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[longitude, latitude], [longitude, latitude], ...]]
      }
    }
  }
});

console.log(result.detections); // GeoJSON with detected objects
console.log(result.geoRawImage); // Raw image data
```

## Supported Models

- **Object Detection**: Detect objects in satellite imagery
- **Building Footprint Segmentation**: Extract building footprints
- **Land Cover Classification**: Classify land cover types
- **Zero-shot Object Detection**: Detect objects without pre-training
- **Oriented Object Detection**: Detect objects with orientation
- **Oil Storage Tank Detection**: Specialized tank detection
- **Solar Panel Detection**: Solar panel identification
- **Ship Detection**: Maritime vessel detection
- **Car Detection**: Vehicle detection in aerial imagery
- **Wetland Segmentation**: Wetland area identification

## API Reference

### Core Functions

#### geoai.pipeline()

Create a pipeline for AI tasks.

```javascript
const pipeline = await geoai.pipeline(
  [
    {
      task: "object-detection",
      modelId: "geobase/WALDO30_yolov8m_640x640",
    },
  ],
  {
    provider: "mapbox", // or "geobase"
    apiKey: "your-api-key",
  }
);
```

#### geoai.tasks()

List all available tasks.

```javascript
const tasks = geoai.tasks();
// Returns: ["object-detection", "zero-shot-object-detection", "mask-generation", ...]
```

#### geoai.models()

List all available models.

```javascript
const models = geoai.models();
// Returns array of model configurations
```

#### geoai.validateChain()

Validate a chain of tasks.

```javascript
const validChains = geoai.validateChain([
  "mask-generation",
  "zero-shot-object-detection",
]);
```

### Pipeline Methods

#### inference()

Run inference on the pipeline.

```javascript
const result = await pipeline.inference({
  inputs: {
    polygon: geoJsonPolygon,
    classLabel: "house", // for zero-shot detection
  },
});
```

### Example: Object Detection

```javascript
import { geoai } from "@geobase-js/geoai";

// Create object detection pipeline
const objectDetection = await geoai.pipeline(
  [
    {
      task: "object-detection",
      modelId: "geobase/WALDO30_yolov8m_640x640",
    },
  ],
  {
    provider: "mapbox",
    apiKey: "your-mapbox-api-key",
  }
);

// Define a polygon area to analyze
const polygon = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-74.006, 40.7128],
        [-74.006, 40.7228],
        [-73.996, 40.7228],
        [-73.996, 40.7128],
        [-74.006, 40.7128],
      ],
    ],
  },
};

// Run detection
const result = await objectDetection.inference({
  inputs: { polygon },
});

// Results contain detected objects as GeoJSON
console.log(result.detections.features); // Array of detected objects
```

### Example: Zero-shot Object Detection

```javascript
import { geoai } from "@geobase-js/geoai";

// Create zero-shot detection pipeline
const zeroShotDetection = await geoai.pipeline(
  [
    {
      task: "zero-shot-object-detection",
    },
  ],
  {
    provider: "geobase",
    apiKey: "your-geobase-api-key",
  }
);

// Run detection with custom class labels
const result = await zeroShotDetection.inference({
  inputs: {
    polygon: geoJsonPolygon,
    classLabel: "car, building, tree",
  },
});

console.log(result.detections);
```

## Examples

See the [examples directory](./examples/) for complete working examples.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Support

- 📖 [Documentation](https://docs.geobase.app/geoaijs)
- 🐛 [Report Issues](https://github.com/decision-labs/geobase-ai.js/issues)
- 💬 [Discussions](https://github.com/decision-labs/geobase-ai.js/discussions)
