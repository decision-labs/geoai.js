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
    carInstance = await geobaseAi.pipeline(
      [{ task: "car-detection" }],
      geobaseParamsCar
    );
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
    const instance = await geobaseAi.pipeline(
      [{ task: "car-detection" }],
      mapboxParams
    );

    expect(instance).toBeInstanceOf(CarDetection);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const instance1 = await geobaseAi.pipeline(
      [{ task: "car-detection" }],
      mapboxParams
    );
    const instance2 = await geobaseAi.pipeline(
      [{ task: "car-detection" }],
      mapboxParams
    );

    expect(instance1).toBe(instance2);
  });

  it("should create new instances for different configurations", async () => {
    const instance1 = await geobaseAi.pipeline(
      [{ task: "car-detection" }],
      mapboxParams
    );
    const instance2 = await geobaseAi.pipeline(
      [{ task: "car-detection" }],
      geobaseParamsCar
    );
    expect(instance1).not.toBe(instance2);
  });

  // test with failing bounds
  it("should process a polygon for car detection with failing bounds", async () => {
    const copyPolygon = { ...polygonCar };
    copyPolygon.geometry.coordinates = failingCoordinates;
    const results = await carInstance.inference({
      inputs: {
        polygon: copyPolygon,
      },
      mapSourceParams: {
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
      mapSourceParams: {
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
