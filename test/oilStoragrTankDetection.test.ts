import { describe, expect, it } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import { mapboxParams, polygonOilStorage } from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { OilStorageTankDetection } from "../src/models/oil_storage_tank_detection";

describe("test model geobase/oil-storage-tank-detection", () => {
  it("should initialize a oil-storage-tank detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "oil-storage-tank-detection",
      mapboxParams
    );

    expect(result.instance).toBeInstanceOf(OilStorageTankDetection);
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
  it("should process a polygon for oil-storage-tank detection for polygon for source mapbox", async () => {
    const { instance } = await geobaseAi.pipeline(
      "oil-storage-tank-detection",
      mapboxParams
    );

    const results: any = await (instance as OilStorageTankDetection).inference(
      polygonOilStorage,
      0.5,
      0.3
    );

    const geoJsonString = JSON.stringify(results.detections);
    const encodedGeoJson = encodeURIComponent(geoJsonString);
    const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;

    console.log(`View GeoJSON here: ${geojsonIoUrl}`);

    // Check basic properties
    expect(results).toHaveProperty("detections");
    expect(results).toHaveProperty("geoRawImage");

    // Check result types
    expect(results.detections.type).toBe("FeatureCollection");
    expect(Array.isArray(results.detections.features)).toBe(true);
    expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
  });
});
