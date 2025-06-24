import { describe, expect, it, beforeAll } from "vitest";

import { geoai } from "@/geobase-ai";
import { geobaseParamsShip, mapboxParams, polygonShip } from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { ShipDetection } from "../src/models/geoai_models";
import { geoJsonToGist } from "./utils/saveToGist";

describe("test model geobase/ship-detection", () => {
  let shipInstance: ShipDetection;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    shipInstance = await geoai.pipeline(
      [{ task: "ship-detection" }],
      mapboxParams
    );
  });

  it("should initialize a ship detection pipeline", async () => {
    const instance = await geoai.pipeline(
      [{ task: "ship-detection" }],
      mapboxParams
    );

    expect(instance).toBeInstanceOf(ShipDetection);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const instance1 = await geoai.pipeline(
      [{ task: "ship-detection" }],
      mapboxParams
    );
    const instance2 = await geoai.pipeline(
      [{ task: "ship-detection" }],
      mapboxParams
    );

    expect(instance1).toBe(instance2);
  });

  it("should create new instances for different configurations", async () => {
    const instance1 = await geoai.pipeline(
      [{ task: "ship-detection" }],
      mapboxParams
    );
    const instance2 = await geoai.pipeline(
      [{ task: "ship-detection" }],
      geobaseParamsShip
    );
    expect(instance1).not.toBe(instance2);
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
