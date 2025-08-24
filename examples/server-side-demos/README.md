# Server-Side Oil Tank Detection Demo

This example demonstrates how to use geoai.js for server-side oil tank detection in satellite imagery.

## ⚠️ Current Status

**Note**: The geoai.js package currently has ES module compatibility issues when used in Node.js server environments. The package is primarily designed for browser usage with WebGPU support.

## What This Demo Shows

This example demonstrates the **correct structure and approach** for server-side oil tank detection, even though the current geoai.js package has compatibility limitations.

## Features

- 🚀 **Real AI inference structure** - Shows how to properly structure geoai.js calls
- 🗺️ **ESRI satellite imagery** - Free satellite imagery provider configuration
- 📍 **Custom polygon area** - Detects oil tanks in specified Dubai area
- 💾 **GeoJSON output** - Saves results in standard geospatial format
- ⚡ **Server-side processing** - No browser dependencies

## Installation

```bash
# Install dependencies
npm install

# The geoai package is installed but has compatibility issues
```

## Code Structure

The example shows the correct approach:

```javascript
// 1. Dynamic import of geoai.js
const { geoai } = await import('geoai');

// 2. Initialize pipeline with oil tank detection
const pipeline = await geoai.pipeline(
  [{ task: "oil-storage-tank-detection" }],
  mapProviderConfig
);

// 3. Run inference on polygon
const result = await pipeline.inference({
  inputs: { polygon: detectionPolygon.features[0] },
  mapSourceParams: { zoomLevel: 15 },
  postProcessingParams: {
    confidenceThreshold: 0.5,
    nmsThreshold: 0.3
  }
});

// 4. Process and save results
const detectionCount = result.detections.features?.length || 0;
fs.writeFileSync('results.geojson', JSON.stringify(result.detections, null, 2));
```

## Configuration

The example uses:
- **Task**: `oil-storage-tank-detection`
- **Provider**: ESRI World Imagery (free, no API key required)
- **Zoom Level**: 15 (optimal for tank detection)
- **Confidence Threshold**: 0.5
- **NMS Threshold**: 0.3

## Polygon Area

The detection runs on a polygon in Dubai with coordinates:
```json
{
  "coordinates": [
    [54.685515505681195, 24.759033512205562],
    [54.6905472240411, 24.7546477478501],
    [54.69519499601981, 24.759180313355216],
    [54.690506808633074, 24.763253976065087]
  ]
}
```

## Expected Output

When the compatibility issues are resolved, you would see:

```
🚀 Real Oil Tank Detection with geoai.js
==================================================
📦 Loading geoai.js...
✅ geoai.js loaded successfully!
🔧 Initializing AI Model...
✅ AI Model Ready!

🔍 Running oil tank detection...
📍 Polygon vertices: 4
✅ Found 3 oil storage tanks!
💾 Results saved to: oil-tank-detection-results.geojson

📊 Detection Details:
   1. Confidence: 87.0%, Class: oil_storage_tank
   2. Confidence: 94.0%, Class: oil_storage_tank
   3. Confidence: 76.0%, Class: oil_storage_tank

🎯 Detection Complete!
```

## Current Issues

1. **ES Module Compatibility**: The geoai.js package uses `__dirname` which is not available in ES modules
2. **Browser-First Design**: The package is optimized for browser environments with WebGPU
3. **Node.js Limitations**: Some features require browser APIs not available in Node.js

## Alternative Approaches

For server-side processing, consider:

1. **Browser Automation**: Use Puppeteer or Playwright to run geoai.js in a headless browser
2. **API Wrapper**: Create a browser-based API that geoai.js can call
3. **Web Worker**: Use geoai.js in a web worker and communicate via messages
4. **Hybrid Approach**: Use geoai.js for model inference in browser, Node.js for data processing

## Requirements

- Node.js >= 18.0.0
- Internet connection (for satellite imagery)
- Sufficient memory for AI model loading

## Integration Ideas

This structure can be integrated into:
- **Browser automation workflows**
- **API endpoints** that use headless browsers
- **Geospatial workflows** with other tools
- **Monitoring systems** for infrastructure

## Troubleshooting

- **Module errors**: The package is designed for browsers, not Node.js
- **WebGPU issues**: Requires browser environment with WebGPU support
- **Memory errors**: Consider using browser automation for heavy processing
