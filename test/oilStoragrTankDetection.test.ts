import { describe, expect, it, beforeAll } from "vitest";

import { geoai } from "@/geobase-ai";
import { mapboxParams, polygonOilStorage } from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { OilStorageTankDetection } from "../src/models/oil_storage_tank_detection";
import { geoJsonToGist } from "./utils/saveToGist";

describe("test model geobase/oil-storage-tank-detection", () => {
  let oilStorageInstance: OilStorageTankDetection;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    oilStorageInstance = await geoai.pipeline(
      [{ task: "oil-storage-tank-detection" }],
      mapboxParams
    );
  });

  it("should initialize a oil-storage-tank detection pipeline", async () => {
    const instance = await geoai.pipeline(
      [{ task: "oil-storage-tank-detection" }],
      mapboxParams
    );

    expect(instance).toBeInstanceOf(OilStorageTankDetection);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const instance1 = await geoai.pipeline(
      [{ task: "oil-storage-tank-detection" }],
      mapboxParams
    );
    const instance2 = await geoai.pipeline(
      [{ task: "oil-storage-tank-detection" }],
      mapboxParams
    );

    expect(instance1).toBe(instance2);
  });

  it("should process a polygon for oil-storage-tank detection", async () => {
    const results = await oilStorageInstance.inference({
      inputs: {
        polygon: polygonOilStorage,
      },
      postProcessingParams: {
        confidenceThreshold: 0.5,
        nmsThreshold: 0.3,
      },
    });

    // Validate GeoJSON structure
    expect(results.detections).toBeDefined();
    expect(results.detections.type).toBe("FeatureCollection");
    expect(Array.isArray(results.detections.features)).toBe(true);

    // Validate image data
    expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
    expect(results.geoRawImage.data).toBeDefined();
    expect(results.geoRawImage.width).toBeGreaterThan(0);
    expect(results.geoRawImage.height).toBeGreaterThan(0);

    // Save output to gist
    await geoJsonToGist({
      content: results.detections,
      fileName: "oilStorageTankDetection.geojson",
      description:
        "result oilStorageTankDetection - should process a polygon for oil-storage-tank detection",
    });
  });
});
