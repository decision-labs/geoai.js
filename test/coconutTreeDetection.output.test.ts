import { describe, it, expect, beforeAll } from "vitest";
import { geoai } from "../src/index";
import { writeFileSync } from "fs";
import { join } from "path";

// Test polygon for coconut tree detection (Southeast Asia - tropical region)
// Using imagery from: https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/65c6eb328931500001717ddc/0/65c6eb328931500001717ddd.tif
// Expanded area to capture more potential coconut trees
const testPolygon: GeoJSON.Feature = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [96.1053, 4.2168], // Moderately expanded bounds
        [96.1057, 4.2168],
        [96.1057, 4.2162],
        [96.1053, 4.2162],
        [96.1053, 4.2168],
      ],
    ],
  },
};

describe("Coconut Tree Detection - Output Results", () => {
  // Skip tests if no API key is provided
  const skipTest = !process.env.GEOBASE_API_KEY;

  beforeAll(() => {
    if (skipTest) {
      console.log(
        "⚠️  Skipping Coconut Tree Detection output tests - GEOBASE_API_KEY not provided"
      );
    }
  });

  it.skipIf(skipTest)(
    "should detect coconut trees and save results as GeoJSON",
    async () => {
      const pipeline = await geoai.pipeline(
        [{ task: "coconut-tree-detection" }],
        {
          provider: "geobase",
          apikey: process.env.GEOBASE_API_KEY!,
          cogImagery:
            "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/65c6eb328931500001717ddc/0/65c6eb328931500001717ddd.tif",
          projectRef: process.env.GEOBASE_PROJECT_REF!,
        }
      );

      console.log("🌴 Running coconut tree detection...");

      const result = await pipeline.inference({
        inputs: { polygon: testPolygon },
        mapSourceParams: { zoomLevel: 21 },
        postProcessingParams: {
          confidenceThreshold: 0.1, // Much lower threshold to catch more detections
          nmsThreshold: 0.3, // Lower NMS to allow more overlapping detections
        },
      });

      // Create comprehensive output with all information
      const outputData = {
        metadata: {
          timestamp: new Date().toISOString(),
          model: "geobase/coconut-detection-v1-yolov11n",
          task: "coconut-tree-detection",
          testArea: {
            location: "Southeast Asia (96.10°E, 4.21°N)",
            imagery: "OpenAerialMap",
            zoomLevel: 18,
            confidenceThreshold: 0.3,
            nmsThreshold: 0.5,
          },
          performance: {
            detectionCount: result.detections.features.length,
            imageResolution: `${result.geoRawImage.width}x${result.geoRawImage.height}`,
            imageBounds: {
              west: result.geoRawImage.bounds.west,
              south: result.geoRawImage.bounds.south,
              east: result.geoRawImage.bounds.east,
              north: result.geoRawImage.bounds.north,
            },
          },
        },
        testPolygon: testPolygon,
        detections: result.detections,
        summary: {
          totalDetections: result.detections.features.length,
          averageConfidence:
            result.detections.features.length > 0
              ? result.detections.features.reduce(
                  (sum, f) => sum + (f.properties?.confidence || 0),
                  0
                ) / result.detections.features.length
              : 0,
          confidenceRange:
            result.detections.features.length > 0
              ? {
                  min: Math.min(
                    ...result.detections.features.map(
                      f => f.properties?.confidence || 0
                    )
                  ),
                  max: Math.max(
                    ...result.detections.features.map(
                      f => f.properties?.confidence || 0
                    )
                  ),
                }
              : null,
        },
      };

      // Save to multiple formats for easy viewing
      const outputDir = join(process.cwd(), "test-outputs");

      // Ensure directory exists
      try {
        require("fs").mkdirSync(outputDir, { recursive: true });
      } catch (e) {
        // Directory might already exist
      }

      // 1. Full data with metadata (JSON)
      const fullOutputPath = join(
        outputDir,
        "coconut-detection-full-results.json"
      );
      writeFileSync(fullOutputPath, JSON.stringify(outputData, null, 2));

      // 2. Pure GeoJSON for visualization tools
      const geoJsonPath = join(outputDir, "coconut-detection-results.geojson");
      writeFileSync(geoJsonPath, JSON.stringify(result.detections, null, 2));

      // 3. Combined GeoJSON with test area and detections
      const combinedGeoJson = {
        type: "FeatureCollection",
        features: [
          {
            ...testPolygon,
            properties: {
              ...testPolygon.properties,
              type: "test_area",
              description: "Test area for coconut tree detection",
            },
          },
          ...result.detections.features.map(feature => ({
            ...feature,
            properties: {
              ...feature.properties,
              type: "coconut_detection",
            },
          })),
        ],
      };

      const combinedPath = join(
        outputDir,
        "coconut-detection-with-test-area.geojson"
      );
      writeFileSync(combinedPath, JSON.stringify(combinedGeoJson, null, 2));

      console.log(`🌴 Detection Results:`);
      console.log(
        `   Found: ${result.detections.features.length} coconut trees`
      );
      console.log(
        `   Image: ${result.geoRawImage.width}x${result.geoRawImage.height}px`
      );
      console.log(
        `   Bounds: [${result.geoRawImage.bounds.west.toFixed(6)}, ${result.geoRawImage.bounds.south.toFixed(6)}, ${result.geoRawImage.bounds.east.toFixed(6)}, ${result.geoRawImage.bounds.north.toFixed(6)}]`
      );

      if (result.detections.features.length > 0) {
        console.log(
          `   Confidence range: ${outputData.summary.confidenceRange?.min.toFixed(3)} - ${outputData.summary.confidenceRange?.max.toFixed(3)}`
        );
        console.log(
          `   Average confidence: ${outputData.summary.averageConfidence.toFixed(3)}`
        );

        result.detections.features.forEach((detection, idx) => {
          console.log(
            `   Tree ${idx + 1}: ${detection.properties?.confidence?.toFixed(3)} confidence`
          );
        });
      }

      console.log(`\n📁 Output files saved:`);
      console.log(`   Full results: ${fullOutputPath}`);
      console.log(`   GeoJSON only: ${geoJsonPath}`);
      console.log(`   Combined view: ${combinedPath}`);

      console.log(`\n🗺️  To visualize:`);
      console.log(`   • Upload any .geojson file to: https://geojson.io`);
      console.log(`   • Or use QGIS, ArcGIS, or other GIS tools`);
      console.log(`   • Combined file shows both test area and detections`);

      // Verify the response structure
      expect(result).toHaveProperty("detections");
      expect(result).toHaveProperty("geoRawImage");
      expect(result.detections).toHaveProperty("type", "FeatureCollection");
      expect(result.detections).toHaveProperty("features");
      expect(Array.isArray(result.detections.features)).toBe(true);
    },
    120000
  ); // Extended timeout

  it.skipIf(skipTest)(
    "should test different confidence thresholds and save comparison",
    async () => {
      const pipeline = await geoai.pipeline(
        [{ task: "coconut-tree-detection" }],
        {
          provider: "geobase",
          apikey: process.env.GEOBASE_API_KEY!,
          cogImagery:
            "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/65c6eb328931500001717ddc/0/65c6eb328931500001717ddd.tif",
          projectRef: process.env.GEOBASE_PROJECT_REF!,
        }
      );

      const thresholds = [0.2, 0.3, 0.5, 0.7, 0.9];
      const results = [];

      console.log("🧪 Testing different confidence thresholds...");

      for (const threshold of thresholds) {
        console.log(`   Testing threshold: ${threshold}`);

        const result = await pipeline.inference({
          inputs: { polygon: testPolygon },
          mapSourceParams: { zoomLevel: 18 },
          postProcessingParams: {
            confidenceThreshold: threshold,
            nmsThreshold: 0.5,
          },
        });

        results.push({
          threshold,
          detectionCount: result.detections.features.length,
          detections: result.detections,
        });

        console.log(
          `     → Found ${result.detections.features.length} detections`
        );
      }

      // Create comparison GeoJSON
      const comparisonGeoJson = {
        type: "FeatureCollection",
        features: [
          {
            ...testPolygon,
            properties: {
              type: "test_area",
              description: "Test area for confidence threshold comparison",
            },
          },
        ],
      };

      // Add detections from each threshold with different styling
      const colors = ["#ff0000", "#ff8800", "#ffff00", "#88ff00", "#00ff00"];

      results.forEach((result, idx) => {
        result.detections.features.forEach((feature, detIdx) => {
          comparisonGeoJson.features.push({
            ...feature,
            properties: {
              ...feature.properties,
              type: "coconut_detection",
              confidenceThreshold: result.threshold,
              color: colors[idx],
              detectionId: `t${result.threshold}_d${detIdx}`,
              description: `Detected at threshold ${result.threshold} (confidence: ${feature.properties?.confidence?.toFixed(3)})`,
            },
          });
        });
      });

      const outputDir = join(process.cwd(), "test-outputs");
      const comparisonPath = join(
        outputDir,
        "coconut-detection-threshold-comparison.geojson"
      );
      const summaryPath = join(
        outputDir,
        "coconut-detection-threshold-summary.json"
      );

      writeFileSync(comparisonPath, JSON.stringify(comparisonGeoJson, null, 2));
      writeFileSync(
        summaryPath,
        JSON.stringify(
          {
            metadata: {
              timestamp: new Date().toISOString(),
              model: "geobase/coconut-detection-v1-yolov11n",
              test: "confidence_threshold_comparison",
            },
            testArea: testPolygon,
            results: results.map(r => ({
              threshold: r.threshold,
              detectionCount: r.detectionCount,
              detections: r.detections.features.map(f => ({
                confidence: f.properties?.confidence,
                coordinates: f.geometry,
              })),
            })),
          },
          null,
          2
        )
      );

      console.log(`\n📊 Threshold Comparison Results:`);
      results.forEach(result => {
        console.log(
          `   Threshold ${result.threshold}: ${result.detectionCount} detections`
        );
      });

      console.log(`\n📁 Comparison files saved:`);
      console.log(`   Visualization: ${comparisonPath}`);
      console.log(`   Summary data: ${summaryPath}`);

      expect(results.length).toBe(thresholds.length);
    },
    180000
  ); // Extended timeout for multiple inferences
});
