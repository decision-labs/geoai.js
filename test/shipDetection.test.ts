import { describe, expect, it, beforeAll } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import { geobaseParamsShip, mapboxParams, polygonShip } from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { ShipDetection } from "../src/models/geoai_models";
import { geoJsonToGist } from "./utils/saveToGist";

describe("test model geobase/ship-detection", () => {
  let shipInstance: ShipDetection;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    const result = await geobaseAi.pipeline(
      [{ task: "ship-detection" }],
      mapboxParams
    );
    shipInstance = result.instance as ShipDetection;
  });

  it("should initialize a ship detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      [{ task: "ship-detection" }],
      mapboxParams
    );

    expect(result.instance).toBeInstanceOf(ShipDetection);
    expect(result.instance).toBeDefined();
    expect(result.instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      [{ task: "ship-detection" }],
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      [{ task: "ship-detection" }],
      mapboxParams
    );

    expect(result1.instance).toBe(result2.instance);
  });

  it("should create new instances for different configurations", async () => {
    const result1 = await geobaseAi.pipeline(
      [{ task: "ship-detection" }],
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      [{ task: "ship-detection" }],
      geobaseParamsShip
    );
    expect(result1.instance).not.toBe(result2.instance);
  });

  it("should process a polygon for ship detection", async () => {
    const results = await shipInstance.inference({
      inputs: {
        polygon: polygonShip,
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
      fileName: "shipDetection.geojson",
      description:
        "result shipDetection - should process a polygon for ship detection",
    });
  });
});
