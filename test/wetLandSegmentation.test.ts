import { describe, expect, it, beforeAll } from "vitest";

import { geoai } from "@/geobase-ai";
import {
  geobaseParamsWetLand,
  mapboxParams,
  polygonWetLand,
} from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { WetLandSegmentation } from "../src/models/geoai_models";
import { geoJsonToGist } from "./utils/saveToGist";

describe("test model geobase/wetland-segmentation", () => {
  let wetlandInstance: WetLandSegmentation;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    wetlandInstance = await geoai.pipeline(
      [{ task: "wetland-segmentation" }],
      geobaseParamsWetLand
    );
  });

  it("should initialize a wetland detection pipeline", async () => {
    const instance = await geoai.pipeline(
      [{ task: "wetland-segmentation" }],
      mapboxParams
    );

    expect(instance).toBeInstanceOf(WetLandSegmentation);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const instance1 = await geoai.pipeline(
      [{ task: "wetland-segmentation" }],
      mapboxParams
    );
    const instance2 = await geoai.pipeline(
      [{ task: "wetland-segmentation" }],
      mapboxParams
    );

    expect(instance1).toBe(instance2);
  });

  it("should create new instances for different configurations", async () => {
    const instance1 = await geoai.pipeline(
      [{ task: "wetland-segmentation" }],
      mapboxParams
    );
    const instance2 = await geoai.pipeline(
      [{ task: "wetland-segmentation" }],
      geobaseParamsWetLand
    );
    expect(instance1).not.toBe(instance2);
  });

  it("should process a polygon for wetland detection", async () => {
    const results = await wetlandInstance.inference({
      inputs: {
        polygon: polygonWetLand,
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

    // Log visualization URL
    const geoJsonString = JSON.stringify(results.detections, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
    // Save output to gist
    await geoJsonToGist({
      content: geoJsonString,
      fileName: "wetLandSegmentation.geojson",
      description:
        "result wetLandSegmentation - should process a polygon for wetland detection",
    });
  });
});
