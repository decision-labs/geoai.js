import { describe, expect, it, beforeAll } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import {
  geobaseParamsBuilding,
  mapboxParams,
  polygonBuilding,
} from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { BuildingDetection } from "../src/models/geoai_models";
import { geoJsonToGist } from "./utils/saveToGist";

describe("test model building detection", () => {
  let buildingInstance: BuildingDetection;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    buildingInstance = await geobaseAi.pipeline(
      [{ task: "building-detection" }],
      mapboxParams
    );
  });

  it("should initialize a building detection pipeline", async () => {
    const instance = await geobaseAi.pipeline(
      [{ task: "building-detection" }],
      mapboxParams
    );

    expect(instance).toBeInstanceOf(BuildingDetection);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const instance1 = await geobaseAi.pipeline(
      [{ task: "building-detection" }],
      mapboxParams
    );
    const instance2 = await geobaseAi.pipeline(
      [{ task: "building-detection" }],
      mapboxParams
    );

    expect(instance1).toBe(instance2);
  });

  it("should create new instances for different configurations", async () => {
    const instance1 = await geobaseAi.pipeline(
      [{ task: "building-detection" }],
      mapboxParams
    );
    const instance2 = await geobaseAi.pipeline(
      [{ task: "building-detection" }],
      geobaseParamsBuilding
    );
    expect(instance1).not.toBe(instance2);
  });

  it("should process a polygon for building detection", async () => {
    const results = await buildingInstance.inference({
      inputs: {
        polygon: polygonBuilding,
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
      fileName: "buildingDetection.geojson",
      description:
        "result buildingDetection - should process a polygon for building detection",
    });
  });
});
