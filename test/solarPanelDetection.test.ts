import { describe, expect, it, beforeAll } from "vitest";

import { geobaseAi } from "../src/geobase-ai";
import {
  geobaseParamsSolarPanel,
  mapboxParams,
  polygonSolarPannel,
} from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { SolarPanelDetection } from "../src/models/geoai_models";
import { geoJsonToGist } from "./utils/saveToGist";

describe("test model solar pannel detection", () => {
  let solarPanelInstance: SolarPanelDetection;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    const result = await geobaseAi.pipeline(
      "solar-panel-detection",
      mapboxParams
    );
    solarPanelInstance = result.instance as SolarPanelDetection;
  });

  it("should initialize a solar panel detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "solar-panel-detection",
      mapboxParams
    );

    expect(result.instance).toBeInstanceOf(SolarPanelDetection);
    expect(result.instance).toBeDefined();
    expect(result.instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "solar-panel-detection",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "solar-panel-detection",
      mapboxParams
    );

    expect(result1.instance).toBe(result2.instance);
  });

  it("should create new instances for different configurations", async () => {
    const result1 = await geobaseAi.pipeline(
      "solar-panel-detection",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "solar-panel-detection",
      geobaseParamsSolarPanel
    );
    expect(result1.instance).not.toBe(result2.instance);
  });

  it("should process a polygon for solar panel detection", async () => {
    const results = await solarPanelInstance.inference(polygonSolarPannel);

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
      fileName: "solarPanelDetection.geojson",
      description:
        "result solarPanelDetection - should process a polygon for solar panel detection",
    });
  });
});
