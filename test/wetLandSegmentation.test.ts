import { describe, expect, it, beforeAll } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
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
    const result = await geobaseAi.pipeline(
      "wetland-segmentation",
      geobaseParamsWetLand
    );
    wetlandInstance = result.instance as WetLandSegmentation;
  });

  it("should initialize a wetland detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "wetland-segmentation",
      mapboxParams
    );

    expect(result.instance).toBeInstanceOf(WetLandSegmentation);
    expect(result.instance).toBeDefined();
    expect(result.instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "wetland-segmentation",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "wetland-segmentation",
      mapboxParams
    );

    expect(result1.instance).toBe(result2.instance);
  });

  it("should create new instances for different configurations", async () => {
    const result1 = await geobaseAi.pipeline(
      "wetland-segmentation",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "wetland-segmentation",
      geobaseParamsWetLand
    );
    expect(result1.instance).not.toBe(result2.instance);
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
