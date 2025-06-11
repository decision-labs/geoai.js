import { describe, expect, it, beforeAll } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import { geobaseParamsCar, mapboxParams, polygonCar } from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { CarDetection } from "../src/models/geoai_models";
import { geoJsonToGist } from "./utils/saveToGist";

let carInstance: CarDetection;
let workingCoordinates: number[][][];
let failingCoordinates: number[][][];

const geojsonCoordsFromBounds = (bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}) => {
  return [
    [
      [bounds.west, bounds.north],
      [bounds.east, bounds.north],
      [bounds.east, bounds.south],
      [bounds.west, bounds.south],
      [bounds.west, bounds.north],
    ],
  ];
};

describe("test model geobase/car-detection", () => {
  beforeAll(async () => {
    // Initialize instance for reuse across tests
    const result = await geobaseAi.pipeline("car-detection", geobaseParamsCar);
    carInstance = result.instance as CarDetection;
    const workingBounds = {
      north: 29.679105,
      south: 29.678508,
      east: -95.421066,
      west: -95.421753,
    };
    workingCoordinates = geojsonCoordsFromBounds(workingBounds);

    const failingBounds = {
      north: 29.679403,
      south: 29.678508,
      east: -95.421066,
      west: -95.422097,
    };
    failingCoordinates = geojsonCoordsFromBounds(failingBounds);
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

  // test with failing bounds
  it("should process a polygon for car detection with failing bounds", async () => {
    const copyPolygon = { ...polygonCar };
    copyPolygon.geometry.coordinates = failingCoordinates;
    const results = await carInstance.inference({
      inputs: {
        polygon: copyPolygon,
      },
      map_source_parameters: {
        zoomLevel: 20,
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
    // saveimage
    results.geoRawImage.save("carDetectionFailingBounds.png");
    // Save output to gist
    await geoJsonToGist({
      content: results.detections,
      fileName: "carDetetcionFailingBounds.geojson",
      description:
        "result carDetetcionFailingBounds - should process a polygon for car detection",
    });
  });

  // test with working bounds
  it("should process a polygon for car detection with working bounds", async () => {
    const copyPolygon = { ...polygonCar };
    copyPolygon.geometry.coordinates = workingCoordinates;
    console.log("copyPolygon", copyPolygon);
    const results = await carInstance.inference({
      inputs: {
        polygon: copyPolygon,
      },
      map_source_parameters: {
        zoomLevel: 22,
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
    // saveimage
    results.geoRawImage.save("carDetectionWorkingBounds.png");
    // Save output to gist
    await geoJsonToGist({
      content: results.detections,
      fileName: "carDetetcionWorkingBounds.geojson",
      description:
        "result carDetetcionWorkingBounds - should process a polygon for car detection",
    });
  });
});
