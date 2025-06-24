import { describe, expect, it, beforeAll } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import {
  geobaseParamsBuilding,
  mapboxParams,
  polygonBuilding,
} from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { geoJsonToGist } from "./utils/saveToGist";
import { BuildingFootPrintSegmentation } from "../src/models/building_footprint_segmentation";
import { InferenceParams } from "../src/core/types";

describe("test model building detection", () => {
  let buildingInstance: BuildingFootPrintSegmentation;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    buildingInstance = await geobaseAi.pipeline(
      [{ task: "building-footprint-segmentation" }],
      geobaseParamsBuilding
    );
  });

  it("should initialize a building  Footprint detection pipeline", async () => {
    const instance = await geobaseAi.pipeline(
      [{ task: "building-footprint-segmentation" }],
      mapboxParams
    );

    expect(instance).toBeInstanceOf(BuildingFootPrintSegmentation);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const instance1 = await geobaseAi.pipeline(
      [{ task: "building-footprint-segmentation" }],
      mapboxParams
    );
    const instance2 = await geobaseAi.pipeline(
      [{ task: "building-footprint-segmentation" }],
      mapboxParams
    );

    expect(instance1).toBe(instance2);
  });

  it("should create new instances for different configurations", async () => {
    const instance1 = await geobaseAi.pipeline(
      [{ task: "building-footprint-segmentation" }],
      mapboxParams
    );
    const instance2 = await geobaseAi.pipeline(
      [{ task: "building-footprint-segmentation" }],
      geobaseParamsBuilding
    );
    expect(instance1).not.toBe(instance2);
  });

  it("should process a polygon for building Footprint detection", async () => {
    const inferenceParams: InferenceParams = {
      inputs: {
        polygon: polygonBuilding,
      },
      mapSourceParams: {
        zoomLevel: 17,
      },
    };

    const results = await buildingInstance.inference(inferenceParams);

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
      fileName: "buildingFootprint.geojson",
      description:
        "result buildingFootprint - should process a polygon for buildingFootprint detection",
    });
  });
});
