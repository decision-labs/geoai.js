# GeoAI.js User Guide for Frontend Developers

A comprehensive guide for frontend developers to integrate geospatial AI models into web mapping applications using web workers.

## Table of Contents

- [Quick Start](#quick-start)
- [Web Worker Implementation](#web-worker-implementation)
- [Map Integration](#map-integration)
- [Available AI Tasks](#available-ai-tasks)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Complete Examples](#complete-examples)

## Quick Start

### Installation

```bash
npm install @geobase-js/geoai
# or
yarn add @geobase-js/geoai
# or
pnpm add @geobase-js/geoai
```

### Basic Setup

```javascript
import { geoai } from "@geobase-js/geoai";

// Configure your map provider
const mapProviderConfig = {
  provider: "geobase", // or "mapbox"
  projectRef: "your-project-ref",
  apikey: "your-api-key",
  cogImagery: "your-imagery-url"
};

// Initialize a pipeline
const pipeline = await geoai.pipeline(
  [{ task: "object-detection" }],
  mapProviderConfig
);

// Run inference
const result = await pipeline.inference({
  inputs: { polygon: geoJsonPolygon }
});
```

## Web Worker Implementation

### Why Use Web Workers?

Web workers are essential for GeoAI.js because:
- **Non-blocking UI**: AI model inference can be computationally intensive
- **Better performance**: Prevents main thread blocking during model loading and inference
- **Responsive user experience**: Users can continue interacting with the map while AI processes

### Creating a Web Worker

Create a `worker.ts` file:

```typescript
import { geoai, ProviderParams } from "@geobase-js/geoai";
import { PretrainedOptions } from "@huggingface/transformers";

// Message types for worker communication
type WorkerMessage = {
  type: "init" | "inference";
  payload: any;
};

type InitPayload = {
  provider: "geobase" | "mapbox";
  projectRef?: string;
  apikey?: string;
  cogImagery?: string;
  apiKey?: string;
  style?: string;
  modelId?: string;
  task?: string;
};

type InferencePayload = {
  polygon: GeoJSON.Feature;
  classLabel?: string;
  confidenceScore: number;
  zoomLevel: number;
  topk: number;
  task: string;
};

let modelInstance: any = null;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case "init": {
        const { task, provider, modelId, ...config } = payload as InitPayload;
        
        // Initialize the AI pipeline
        modelInstance = await geoai.pipeline(
          [{ task, modelId }],
          { provider, ...config } as ProviderParams
        );
        
        self.postMessage({ type: "init_complete" });
        break;
      }

      case "inference": {
        if (!modelInstance) {
          throw new Error("Model not initialized");
        }

        const { polygon, zoomLevel, confidenceScore, classLabel } = payload as InferencePayload;
        
        const result = await modelInstance.inference({
          inputs: { polygon, classLabel },
          postProcessingParams: { threshold: confidenceScore },
          mapSourceParams: { zoomLevel }
        });
        
        self.postMessage({
          type: "inference_complete",
          payload: result
        });
        break;
      }
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      payload: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
```

### Using the Web Worker in Your Component

```typescript
import { useEffect, useRef, useState } from "react";

export function useGeoAIWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(new URL('./worker.ts', import.meta.url));
    
    workerRef.current.onmessage = (e) => {
      const { type, payload } = e.data;
      
      switch (type) {
        case "init_complete":
          setIsInitialized(true);
          break;
        case "inference_complete":
          setIsProcessing(false);
          onInferenceComplete(payload);
          break;
        case "error":
          setIsProcessing(false);
          console.error("Worker error:", payload);
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const initializeModel = (config: any) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "init",
        payload: config
      });
    }
  };

  const runInference = (params: any) => {
    if (workerRef.current && isInitialized) {
      setIsProcessing(true);
      workerRef.current.postMessage({
        type: "inference",
        payload: params
      });
    }
  };

  return {
    initializeModel,
    runInference,
    isInitialized,
    isProcessing
  };
}
```

## Map Integration

### MapLibre GL JS Integration

```typescript
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";

export function MapComponent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MaplibreDraw | null>(null);
  const { initializeModel, runInference, isInitialized } = useGeoAIWorker();

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "satellite": {
            type: "raster",
            tiles: ["your-tile-server/{z}/{x}/{y}"],
            tileSize: 256
          }
        },
        layers: [{
          id: "satellite-layer",
          type: "raster",
          source: "satellite"
        }]
      },
      center: [longitude, latitude],
      zoom: 18
    });

    // Add drawing controls
    draw.current = new MaplibreDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      }
    });
    
    map.current.addControl(draw.current);

    // Handle polygon creation
    map.current.on('draw.create', handlePolygonCreate);
    
    return () => map.current?.remove();
  }, []);

  const handlePolygonCreate = (e: any) => {
    const polygon = e.features[0];
    
    if (isInitialized) {
      runInference({
        polygon,
        zoomLevel: map.current?.getZoom() || 18,
        confidenceScore: 0.8,
        task: "object-detection"
      });
    }
  };

  // Initialize AI model when component mounts
  useEffect(() => {
    initializeModel({
      provider: "geobase",
      projectRef: process.env.NEXT_PUBLIC_GEOBASE_PROJECT_REF,
      apikey: process.env.NEXT_PUBLIC_GEOBASE_API_KEY,
      task: "object-detection"
    });
  }, []);

  return <div ref={mapContainer} className="w-full h-full" />;
}
```

## Available AI Tasks

### Object Detection
Detects objects in satellite imagery.

```javascript
const pipeline = await geoai.pipeline([{
  task: "object-detection",
  modelId: "geobase/WALDO30_yolov8m_640x640"
}], config);

const result = await pipeline.inference({
  inputs: { polygon },
  postProcessingParams: { confidence: 0.8 },
  mapSourceParams: { zoomLevel: 18 }
});
```

### Zero-Shot Object Detection
Detect custom objects without pre-training.

```javascript
const pipeline = await geoai.pipeline([{
  task: "zero-shot-object-detection"
}], config);

const result = await pipeline.inference({
  inputs: {
    polygon,
    classLabel: "car, building, tree"
  },
  postProcessingParams: { threshold: 0.8, topk: 10 },
  mapSourceParams: { zoomLevel: 18 }
});
```

### Building Footprint Segmentation
Extract building outlines.

```javascript
const pipeline = await geoai.pipeline([{
  task: "building-footprint-segmentation"
}], config);

const result = await pipeline.inference({
  inputs: { polygon },
  postProcessingParams: {
    confidenceThreshold: 0.8,
    minArea: 100
  },
  mapSourceParams: { zoomLevel: 18 }
});
```

### Land Cover Classification
Classify terrain types.

```javascript
const pipeline = await geoai.pipeline([{
  task: "land-cover-classification"
}], config);

const result = await pipeline.inference({
  inputs: { polygon },
  postProcessingParams: { minArea: 50 },
  mapSourceParams: { zoomLevel: 16 }
});
```

### Mask Generation (SAM)
Generate segmentation masks with point prompts.

```javascript
const pipeline = await geoai.pipeline([{
  task: "mask-generation"
}], config);

const result = await pipeline.inference({
  inputs: {
    polygon,
    input: { type: "Point", coordinates: [lng, lat] }
  },
  postProcessingParams: { maxMasks: 3 },
  mapSourceParams: { zoomLevel: 18 }
});
```

## Error Handling

### Worker Error Handling

```typescript
workerRef.current.onmessage = (e) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case "error":
      console.error("AI processing error:", payload);
      setError(payload);
      setIsProcessing(false);
      break;
  }
};

workerRef.current.onerror = (error) => {
  console.error("Worker error:", error);
  setError("Worker failed to load");
};
```

### API Error Handling

```typescript
const handleInference = async () => {
  try {
    setIsProcessing(true);
    setError(null);
    
    runInference(inferenceParams);
  } catch (error) {
    console.error("Inference failed:", error);
    setError(error instanceof Error ? error.message : "Inference failed");
  } finally {
    setIsProcessing(false);
  }
};
```

## Performance Optimization

### Memory Management

```typescript
// Clean up resources
useEffect(() => {
  return () => {
    // Terminate worker
    workerRef.current?.terminate();
    
    // Clean up map
    map.current?.remove();
    
    // Clear large data structures
    setDetections(undefined);
    setDetectionResult(null);
  };
}, []);
```

### Optimizing Inference Parameters

```typescript
// Adjust parameters based on use case
const getOptimalParams = (task: string, zoomLevel: number) => {
  const baseParams = {
    zoomLevel,
    confidenceScore: 0.8
  };

  switch (task) {
    case "object-detection":
      return {
        ...baseParams,
        confidenceScore: zoomLevel > 18 ? 0.6 : 0.8
      };
    case "building-footprint-segmentation":
      return {
        ...baseParams,
        minArea: zoomLevel > 16 ? 50 : 100
      };
    default:
      return baseParams;
  }
};
```

### Debouncing User Input

```typescript
import { debounce } from "lodash";

const debouncedInference = debounce((params) => {
  runInference(params);
}, 500);

// Use debounced function for parameter changes
useEffect(() => {
  if (polygon) {
    debouncedInference({
      polygon,
      confidenceScore,
      zoomLevel
    });
  }
}, [polygon, confidenceScore, zoomLevel]);
```

## Complete Examples

### Full React Component with TypeScript

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";

interface GeoAIMapProps {
  task: string;
  provider: "geobase" | "mapbox";
  apiConfig: {
    projectRef?: string;
    apikey?: string;
    apiKey?: string;
  };
}

export default function GeoAIMap({ task, provider, apiConfig }: GeoAIMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MaplibreDraw | null>(null);
  const workerRef = useRef<Worker | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.ts', import.meta.url));
    
    workerRef.current.onmessage = (e) => {
      const { type, payload } = e.data;
      
      switch (type) {
        case "init_complete":
          setIsInitialized(true);
          break;
        case "inference_complete":
          setIsProcessing(false);
          setResults(payload);
          displayResults(payload);
          break;
        case "error":
          setIsProcessing(false);
          setError(payload);
          break;
      }
    };

    // Initialize AI model
    workerRef.current.postMessage({
      type: "init",
      payload: { task, provider, ...apiConfig }
    });

    return () => workerRef.current?.terminate();
  }, [task, provider, apiConfig]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyle(provider, apiConfig),
      center: [-74.006, 40.7128],
      zoom: 18
    });

    draw.current = new MaplibreDraw();
    map.current.addControl(draw.current);
    
    map.current.on('draw.create', handlePolygonCreate);

    return () => map.current?.remove();
  }, []);

  const handlePolygonCreate = (e: any) => {
    if (!isInitialized || isProcessing) return;

    const polygon = e.features[0];
    setIsProcessing(true);
    setError(null);

    workerRef.current?.postMessage({
      type: "inference",
      payload: {
        polygon,
        zoomLevel: map.current?.getZoom() || 18,
        confidenceScore: 0.8,
        task
      }
    });
  };

  const displayResults = (results: any) => {
    if (!map.current || !results.detections) return;

    // Add results to map
    if (map.current.getSource("ai-results")) {
      map.current.removeLayer("ai-results-layer");
      map.current.removeSource("ai-results");
    }

    map.current.addSource("ai-results", {
      type: "geojson",
      data: results.detections
    });

    map.current.addLayer({
      id: "ai-results-layer",
      type: "fill",
      source: "ai-results",
      paint: {
        "fill-color": "#ff0000",
        "fill-opacity": 0.3,
        "fill-outline-color": "#ff0000"
      }
    });
  };

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Status indicators */}
      {!isInitialized && (
        <div className="absolute top-4 left-4 bg-yellow-100 px-3 py-2 rounded">
          Initializing AI model...
        </div>
      )}
      
      {isProcessing && (
        <div className="absolute top-4 left-4 bg-blue-100 px-3 py-2 rounded">
          Processing...
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 left-4 bg-red-100 px-3 py-2 rounded text-red-700">
          Error: {error}
        </div>
      )}
    </div>
  );
}

function getMapStyle(provider: string, config: any) {
  // Return appropriate map style based on provider
  return {
    version: 8,
    sources: {
      satellite: {
        type: "raster",
        tiles: provider === "geobase" 
          ? [`https://${config.projectRef}.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${config.cogImagery}&apikey=${config.apikey}`]
          : [`https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.jpg90?access_token=${config.apiKey}`],
        tileSize: 256
      }
    },
    layers: [{
      id: "satellite-layer",
      type: "raster",
      source: "satellite"
    }]
  };
}
```

This documentation provides frontend developers with everything they need to integrate GeoAI.js into their mapping applications, with special emphasis on web worker implementation for optimal performance.