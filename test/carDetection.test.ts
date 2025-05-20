import { describe, expect, it, beforeAll } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import { geobaseParamsCar, mapboxParams, polygonCar } from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { CarDetection } from "../src/models/geoai_models";

describe("test model geobase/car-detection", () => {
  let carInstance: CarDetection;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    const result = await geobaseAi.pipeline("car-detection", mapboxParams);
    carInstance = result.instance as CarDetection;
  });

  it("should initialize a car detection pipeline", async () => {
    const result = await geobaseAi.pipeline("car-detection", mapboxParams);

    expect(result.instance).toBeInstanceOf(CarDetection);
    expect(result.instance).toBeDefined();
    expect(result.instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline("car-detection", mapboxParams);
    const result2 = await geobaseAi.pipeline("car-detection", mapboxParams);

    expect(result1.instance).toBe(result2.instance);
    expect(result1.instance.detector).toBe(result2.instance.detector);
  });

  it("should create new instances for different configurations", async () => {
    const result1 = await geobaseAi.pipeline("car-detection", mapboxParams);
    const result2 = await geobaseAi.pipeline("car-detection", geobaseParamsCar);
    expect(result1.instance).not.toBe(result2.instance);
  });

  it("should process a polygon for car detection", async () => {
    const results = await carInstance.inference(polygonCar);

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
    console.log(`View GeoJSON for car detection: ${geojsonIoUrl}`);
  });
});
