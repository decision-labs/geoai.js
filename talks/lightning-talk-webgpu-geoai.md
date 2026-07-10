footer: S. Burq & M. Hassan | decision-labs.com | Big Data from Space 2025

<!-- Assets: https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/talks/ -->

# GeoAI.js

## Bringing Earth Observation AI to the Browser with WebGPU

^ My name is Shoaib and I'm excited to talk about GeoAI.js, a library we are developing at Decision-Labs.com that brings state of the art GeoAI models to the web.

---

## What is GeoAI.js?

![inline](https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/talks/geoaijs.png)

^ GeoAI.js is an open-source JavaScript library that enables AI tasks on satellite imagery directly in the browser, powered by WebGPU.

---

## Supported Tasks already include

### Object Detection 
### Classification
### Segmentation and
### Advanced Tasks

---

[.column]

**Object Detection**
- Car Detection
- Ship Detection
- Building Detection
- Oil Storage Tank Detection
- Solar Panel Detection

**Classification**
- Land Cover Classification

[.column]

**Segmentation**
- Image Segmentation
- Wetland Segmentation
- Building Footprint Segmentation
- Mask Generation

**Advanced Tasks**
- Zero-shot Object Detection
- Oriented Object Detection
- Image Feature Extraction

---

## The Problem

^ Most GeoAI solutions today require cloud infrastructure or specialized Python environments. This creates barriers for web developers.

- Most GeoAI solutions require complex cloud infrastructure
- Python environments create barriers for web developers
- Web integration of geospatial AI remains challenging
- Huge community of JavaScript Developers left behind

---

## The Solution

^ Most developer already know how to use mapping libraries like Leaflet, Maplibre to display satellite imagery in their applications. GeoAI.js simply extends that functionality by adding AI capabilities so they can accept tiles from external providers and run AI models on them. Transformers.js already provides the foundation for running AI models in the browser.

### Build on existing standards & familiar tools

- Just Extend existing frontend libraries with AI capabilities like leaflet, deck.gl or maplibre.
- Add tasks specific for Geospatial AI (e.g. object detection, land cover classification, etc.)
- Add support for different imagery providers (e.g. ESRI, Mapbox, Google Maps)


---

## Live Demo

^ Let me show you GeoAI.js in action. I'll run object detection on satellite imagery directly in the browser.

<!-- [.column]

![fit](https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/talks/no-sound.mp4)

.[column] -->

### [https://docs.geobase.app/geoai-live](https://docs.geobase.app/geoai-live)

---

# How Does It Work?

---

^ Under the hood, GeoAI.js uses WebGPU for acceleration and supports multiple AI models for different geospatial tasks.

#### 1. Model Conversion for GeoAI.js / Transformers.js

[.column]


- **Convert to ONNX format:** Supported Frameworks: TensorFlow, PyTorch, JAX
- **Quantization Scripts:** huggingface/transformers.js/scripts
- **Host Models:** https://huggingface.co/geobase


[.column]

![inline 75%](https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/talks/transformersjs.png)

----

### 2. Write javascript code to run the models on the imagery

```typescript
import { geoai } from "geoai";

const pipeline = await geoai.pipeline([{ task: "object-detection" }], {
  provider: "esa",
});

const result = await pipeline.inference({
  inputs: { polygon: yourPolygon },
  postProcessingParams: { confidence: 0.8 },
  mapSourceParams: { zoomLevel: 18 },
});
```

---

### 3. Display the results on a map

![inline](https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/talks/vue-geoai.gif)

---

## Key Benefits

^ Here's why GeoAI.js matters for web developers.

- **No Cloud Infrastructure** - Run AI locally in the browser
- **Real-time Analysis** - Instant results without API calls
- **Cost Effective** - No per-request pricing
- **Privacy First** - Data stays in the browser
- **Easy Integration** - Works with any mapping provider

---

### Getting Started

^ Getting started with GeoAI.js is straightforward. You can install it via npm and start running AI models in minutes.


## `npm install geoai`

---

## Thank You!

^ Thank you for your attention! GeoAI.js is open source and we'd love your contributions and feedback.

**Questions?**

- **GitHub:** https://github.com/geobase/geoai.js
- **Documentation:** https://docs.geobase.app/geoai
- **Live Playground:** https://docs.geobase.app/geoai-live
- **Models:** https://huggingface.co/geobase/models

- **Email:** [shoaib@decision-labs.com](mailto:shoaib@decision-labs.com)

