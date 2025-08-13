import { describe, expect, it } from "vitest";
import { geoai } from "../src/geobase-ai";
import { join } from "path";

describe("ESRI Integration", () => {
  it("should work with geoai pipeline and run inference", async () => {
    const esriParams = {
      provider: "esri" as const,
    };

    const testPolygon = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        coordinates: [
          [
            [12.482802629103247, 41.885379230564524],
            [12.481392196198271, 41.885379230564524],
            [12.481392196198271, 41.884332326712524],
            [12.482802629103247, 41.884332326712524],
            [12.482802629103247, 41.885379230564524],
          ],
        ],
        type: "Polygon" as const,
      },
    };

    // Test that we can create a model with ESRI provider
    const model = await geoai.pipeline(
      [{ task: "object-detection" }],
      esriParams
    );

    expect(model).toBeDefined();
    expect(model).toHaveProperty("inference");

    // Run inference
    const result = await model.inference({
      inputs: {
        polygon: testPolygon,
      },
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("detections");
    expect(result).toHaveProperty("geoRawImage");

    // Save the image for debugging
    const image = result.geoRawImage;
    console.log(`Image dimensions: ${image.width}x${image.height}`);
  });
});
