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
import { InferenceParameters } from "../src/core/types";

describe("test model building detection", () => {
  let buildingInstance: BuildingFootPrintSegmentation;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    const result = await geobaseAi.pipeline(
      [{ task: "building-footprint-segmentation" }],
      geobaseParamsBuilding
    );
    buildingInstance = result.instance as BuildingFootPrintSegmentation;
  });

  it("should initialize a building  Footprint detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      [{ task: "building-footprint-segmentation" }],
      mapboxParams
    );

    expect(result.instance).toBeInstanceOf(BuildingFootPrintSegmentation);
    expect(result.instance).toBeDefined();
    expect(result.instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      [{ task: "building-footprint-segmentation" }],
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      [{ task: "building-footprint-segmentation" }],
      mapboxParams
    );

    expect(result1.instance).toBe(result2.instance);
    expect(result1.instance.detector).toBe(result2.instance.detector);
  });

  it("should create new instances for different configurations", async () => {
    const result1 = await geobaseAi.pipeline(
      [{ task: "building-footprint-segmentation" }],
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      [{ task: "building-footprint-segmentation" }],
      geobaseParamsBuilding
    );
    expect(result1.instance).not.toBe(result2.instance);
  });

  it("should process a polygon for building Footprint detection", async () => {
    const inferenceParams: InferenceParameters = {
      inputs: {
        polygon: polygonBuilding,
      },
      map_source_parameters: {
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
