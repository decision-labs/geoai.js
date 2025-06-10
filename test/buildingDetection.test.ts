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
    const result = await geobaseAi.pipeline("building-detection", mapboxParams);
    buildingInstance = result.instance as BuildingDetection;
  });

  it("should initialize a building detection pipeline", async () => {
    const result = await geobaseAi.pipeline("building-detection", mapboxParams);

    expect(result.instance).toBeInstanceOf(BuildingDetection);
    expect(result.instance).toBeDefined();
    expect(result.instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "building-detection",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "building-detection",
      mapboxParams
    );

    expect(result1.instance).toBe(result2.instance);
    expect(result1.instance.detector).toBe(result2.instance.detector);
  });

  it("should create new instances for different configurations", async () => {
    const result1 = await geobaseAi.pipeline(
      "building-detection",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "building-detection",
      geobaseParamsBuilding
    );
    expect(result1.instance).not.toBe(result2.instance);
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
