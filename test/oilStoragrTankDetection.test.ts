import { describe, expect, it, beforeAll } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import { mapboxParams, polygonOilStorage } from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { OilStorageTankDetection } from "../src/models/oil_storage_tank_detection";

describe("test model geobase/oil-storage-tank-detection", () => {
  let oilStorageInstance: OilStorageTankDetection;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    const result = await geobaseAi.pipeline(
      "oil-storage-tank-detection",
      mapboxParams
    );
    oilStorageInstance = result.instance as OilStorageTankDetection;
  });

  it("should initialize a oil-storage-tank detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "oil-storage-tank-detection",
      mapboxParams
    );

    expect(result.instance).toBeInstanceOf(OilStorageTankDetection);
    expect(result.instance).toBeDefined();
    expect(result.instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "oil-storage-tank-detection",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "oil-storage-tank-detection",
      mapboxParams
    );

    expect(result1.instance).toBe(result2.instance);
  });

  it("should process a polygon for oil-storage-tank detection", async () => {
    const results = await oilStorageInstance.inference(
      polygonOilStorage,
      0.5,
      0.3
    );

    // Validate GeoJSON structure
    expect(results.detections).toBeDefined();
    expect(results.detections.type).toBe("FeatureCollection");
    expect(Array.isArray(results.detections.features)).toBe(true);

    // Validate image data
    expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
    expect(results.geoRawImage.data).toBeDefined();
    expect(results.geoRawImage.width).toBeGreaterThan(0);
    expect(results.geoRawImage.height).toBeGreaterThan(0);

    // Log visualization URL
    const geoJsonString = JSON.stringify(results.detections);
    const encodedGeoJson = encodeURIComponent(geoJsonString);
    const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;
    console.log(`View GeoJSON for oil storage tank detection: ${geojsonIoUrl}`);
  });
});
