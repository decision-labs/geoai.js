import { describe, expect, it, beforeAll } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import { geobaseParamsCar, mapboxParams, polygonCar } from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { CarDetection } from "../src/models/geoai_models";
import { geoJsonToGist } from "./utils/saveToGist";

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
    const results = await carInstance.inference({
      inputs: {
        polygon: polygonCar,
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
      fileName: "carDetetcion.geojson",
      description:
        "result carDetetcion - should process a polygon for car detection",
    });
  });
});
