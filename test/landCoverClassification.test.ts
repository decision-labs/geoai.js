import { describe, expect, it, beforeAll } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import { geobaseParams, polygon } from "./constants";

import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { LandCoverClassification } from "../src/models/land_cover_classification";
import { RawImage } from "@huggingface/transformers";
import { geoJsonToGist } from "./utils/saveToGist";

describe("test model geobase/land-cover-classification", () => {
  let landCoverInstance: LandCoverClassification;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    const result = await geobaseAi.pipeline(
      [{ task: "land-cover-classification" }],
      geobaseParams
    );
    landCoverInstance = result.instance as LandCoverClassification;
  });

  it("should initialize a land cover classification pipeline", async () => {
    const result = await geobaseAi.pipeline(
      [{ task: "land-cover-classification" }],
      geobaseParams
    );

    expect(result.instance).toBeInstanceOf(LandCoverClassification);
    expect(result.instance).toBeDefined();
    expect(result.instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      [{ task: "land-cover-classification" }],
      geobaseParams
    );
    const result2 = await geobaseAi.pipeline(
      [{ task: "land-cover-classification" }],
      geobaseParams
    );

    expect(result1.instance).toBe(result2.instance);
  });

  it("should process a polygon for land cover classification", async () => {
    const results = await landCoverInstance.inference({
      inputs: {
        polygon,
      },
    });

    // Validate basic properties
    expect(results).toHaveProperty("detections");
    expect(results).toHaveProperty("outputImage");
    expect(results).toHaveProperty("binaryMasks");

    // Validate detections
    expect(Array.isArray(results.detections)).toBe(true);
    results.detections.forEach(async (detection: GeoJSON.FeatureCollection) => {
      expect(detection.type).toBe("FeatureCollection");
      expect(Array.isArray(detection.features)).toBe(true);

      // Save output to gist
      await geoJsonToGist({
        content: detection,
        fileName: "landCoverClassification.geojson",
        description:
          "result landCoverClassification - should process a polygon for land cover classification",
      });
    });

    // Validate output image
    expect(results.outputImage).toBeInstanceOf(GeoRawImage);
    expect(results.outputImage.data).toBeDefined();
    expect(results.outputImage.width).toBeGreaterThan(0);
    expect(results.outputImage.height).toBeGreaterThan(0);

    // Validate binary masks
    expect(Array.isArray(results.binaryMasks)).toBe(true);
    results.binaryMasks.forEach((mask: RawImage) => {
      expect(mask).toBeInstanceOf(RawImage);
      expect(mask.data).toBeDefined();
      expect(mask.width).toBeGreaterThan(0);
      expect(mask.height).toBeGreaterThan(0);
    });
  });
});
