import { describe, expect, it, beforeAll } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import { mapboxParams, polygonOilStorage } from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { OilStorageTankDetection } from "../src/models/oil_storage_tank_detection";
import { geoJsonToGist } from "./utils/saveToGist";

describe("test model geobase/oil-storage-tank-detection", () => {
  let oilStorageInstance: OilStorageTankDetection;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    const result = await geobaseAi.pipeline(
      [{ task: "oil-storage-tank-detection" }],
      mapboxParams
    );
    oilStorageInstance = result.instance as OilStorageTankDetection;
  });

  it("should initialize a oil-storage-tank detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      [{ task: "oil-storage-tank-detection" }],
      mapboxParams
    );

    expect(result.instance).toBeInstanceOf(OilStorageTankDetection);
    expect(result.instance).toBeDefined();
    expect(result.instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      [{ task: "oil-storage-tank-detection" }],
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      [{ task: "oil-storage-tank-detection" }],
      mapboxParams
    );

    expect(result1.instance).toBe(result2.instance);
  });

  it("should process a polygon for oil-storage-tank detection", async () => {
    const results = await oilStorageInstance.inference({
      inputs: {
        polygon: polygonOilStorage,
      },
      post_processing_parameters: {
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
