import { describe, expect, it, beforeAll } from "vitest";

import { geoai } from "@/geoai";
import { geobaseParams, polygon } from "./constants";

import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { LandCoverClassification } from "../src/models/land_cover_classification";
import { RawImage } from "@huggingface/transformers";
import { geoJsonToGist } from "./utils/saveToGist";

describe("test model geobase/land-cover-classification", () => {
  let landCoverInstance: LandCoverClassification;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    landCoverInstance = await geoai.pipeline(
      [{ task: "land-cover-classification" }],
      geobaseParams
    );
  });

  it("should initialize a land cover classification pipeline", async () => {
    const instance = await geoai.pipeline(
      [{ task: "land-cover-classification" }],
      geobaseParams
    );

    expect(instance).toBeInstanceOf(LandCoverClassification);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const instance1 = await geoai.pipeline(
      [{ task: "land-cover-classification" }],
      geobaseParams
    );
    const instance2 = await geoai.pipeline(
      [{ task: "land-cover-classification" }],
      geobaseParams
    );

    expect(instance1).toBe(instance2);
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
    expect(results).toHaveProperty("geoRawImage");

    // Validate detections
    expect(results.detections.type).toBe("FeatureCollection");
    expect(Array.isArray(results.detections.features)).toBe(true);
    // Save output to gist
    await geoJsonToGist({
      content: results.detections,
      fileName: "landCoverClassification.geojson",
      description:
        "result landCoverClassification - should process a polygon for land cover classification",
    });

    // Validate output image
    expect(results.outputImage).toBeInstanceOf(GeoRawImage);
    expect(results.outputImage.data).toBeDefined();
    expect(results.outputImage.width).toBeGreaterThan(0);
    expect(results.outputImage.height).toBeGreaterThan(0);

    // Validate Reference image
    expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
    expect(results.geoRawImage.data).toBeDefined();
    expect(results.geoRawImage.width).toBeGreaterThan(0);
    expect(results.geoRawImage.height).toBeGreaterThan(0);
  });
});
