import { describe, it, expect, beforeAll } from "vitest";
import { geoai } from "../src/index";

// Test polygon for coconut tree detection (Southeast Asia - tropical region)
// Using imagery from: https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/65c6eb328931500001717ddc/0/65c6eb328931500001717ddd.tif
const testPolygon: GeoJSON.Feature = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [96.10557612318473, 4.216740108849962],
        [96.10530371636793, 4.216740108849962],
        [96.10530371636793, 4.2163301933439215],
        [96.10557612318473, 4.2163301933439215],
        [96.10557612318473, 4.216740108849962],
      ],
    ],
  },
};

describe("Coconut Tree Detection", () => {
  // Skip tests if no API key is provided
  const skipTest = !process.env.GEOBASE_API_KEY;

  beforeAll(() => {
    if (skipTest) {
      console.log(
        "⚠️  Skipping Coconut Tree Detection tests - GEOBASE_API_KEY not provided"
      );
    }
  });

  it.skipIf(skipTest)(
    "should detect coconut trees in aerial imagery",
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

      const result = await pipeline.inference({
        inputs: { polygon: testPolygon },
        mapSourceParams: { zoomLevel: 18 },
      });

      // Verify the response structure
      expect(result).toHaveProperty("detections");
      expect(result).toHaveProperty("geoRawImage");
      expect(result.detections).toHaveProperty("type", "FeatureCollection");
      expect(result.detections).toHaveProperty("features");
      expect(Array.isArray(result.detections.features)).toBe(true);

      // Log results for manual verification
      console.log(`Found ${result.detections.features.length} coconut trees`);

      if (result.detections.features.length > 0) {
        console.log("Sample detection:", result.detections.features[0]);

        // Verify detection properties
        const detection = result.detections.features[0];
        expect(detection).toHaveProperty("type", "Feature");
        expect(detection).toHaveProperty("geometry");
        expect(detection).toHaveProperty("properties");
        expect(detection.properties).toHaveProperty("confidence");
        expect(detection.properties).toHaveProperty("class", "coconut_tree");
        expect(detection.geometry).toHaveProperty("type", "Polygon");

        // Verify confidence is within valid range
        expect(detection.properties.confidence).toBeGreaterThan(0);
        expect(detection.properties.confidence).toBeLessThanOrEqual(1);
      }
    },
    60000
  ); // Extended timeout for model initialization

  it.skipIf(skipTest)(
    "should respect confidence threshold parameter",
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

      // Test with high confidence threshold
      const highConfidenceResult = await pipeline.inference({
        inputs: { polygon: testPolygon },
        postProcessingParams: { confidenceThreshold: 0.8 },
        mapSourceParams: { zoomLevel: 18 },
      });

      // Test with low confidence threshold
      const lowConfidenceResult = await pipeline.inference({
        inputs: { polygon: testPolygon },
        postProcessingParams: { confidenceThreshold: 0.3 },
        mapSourceParams: { zoomLevel: 18 },
      });

      // Low confidence should return >= high confidence detections
      expect(
        lowConfidenceResult.detections.features.length
      ).toBeGreaterThanOrEqual(highConfidenceResult.detections.features.length);

      console.log(
        `High confidence (0.8): ${highConfidenceResult.detections.features.length} trees`
      );
      console.log(
        `Low confidence (0.3): ${lowConfidenceResult.detections.features.length} trees`
      );
    },
    60000
  );

  it.skipIf(skipTest)(
    "should handle different zoom levels",
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

      // Test with different zoom levels
      const zoomLevels = [17, 18, 19];

      for (const zoomLevel of zoomLevels) {
        const result = await pipeline.inference({
          inputs: { polygon: testPolygon },
          mapSourceParams: { zoomLevel },
        });

        expect(result).toHaveProperty("detections");
        expect(result.detections).toHaveProperty("features");

        console.log(
          `Zoom ${zoomLevel}: ${result.detections.features.length} trees detected`
        );
      }
    },
    120000
  ); // Extended timeout for multiple requests

  it("should validate input parameters", async () => {
    if (skipTest) return;

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

    // Should throw error for missing polygon
    await expect(
      pipeline.inference({
        inputs: {} as any,
      })
    ).rejects.toThrow("Polygon input is required");

    // Should throw error for invalid geometry type
    const invalidPolygon = {
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [-80.1234, 25.7617],
      },
      properties: {},
    };

    await expect(
      pipeline.inference({
        inputs: { polygon: invalidPolygon as any },
      })
    ).rejects.toThrow("Input must be a valid GeoJSON Polygon feature");
  });

  it("should handle model initialization correctly", async () => {
    if (skipTest) return;

    // Test that model can be initialized multiple times without error
    const pipeline1 = await geoai.pipeline(
      [{ task: "coconut-tree-detection" }],
      {
        provider: "geobase",
        apikey: process.env.GEOBASE_API_KEY!,
        cogImagery:
          "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/65c6eb328931500001717ddc/0/65c6eb328931500001717ddd.tif",
        projectRef: process.env.GEOBASE_PROJECT_REF!,
      }
    );

    const pipeline2 = await geoai.pipeline(
      [{ task: "coconut-tree-detection" }],
      {
        provider: "geobase",
        apikey: process.env.GEOBASE_API_KEY!,
        cogImagery:
          "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/65c6eb328931500001717ddc/0/65c6eb328931500001717ddd.tif",
        projectRef: process.env.GEOBASE_PROJECT_REF!,
      }
    );

    // Both pipelines should work
    const result1 = await pipeline1.inference({
      inputs: { polygon: testPolygon },
      mapSourceParams: { zoomLevel: 18 },
    });

    const result2 = await pipeline2.inference({
      inputs: { polygon: testPolygon },
      mapSourceParams: { zoomLevel: 18 },
    });

    expect(result1).toHaveProperty("detections");
    expect(result2).toHaveProperty("detections");
  }, 60000);
});
