import { describe, expect, it, beforeAll } from "vitest";

import { geoai } from "@/geobase-ai";
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
    solarPanelInstance = await geoai.pipeline(
      [{ task: "solar-panel-detection" }],
      mapboxParams
    );
  });

  it("should initialize a solar panel detection pipeline", async () => {
    const instance = await geoai.pipeline(
      [{ task: "solar-panel-detection" }],
      mapboxParams
    );

    expect(instance).toBeInstanceOf(SolarPanelDetection);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const instance1 = await geoai.pipeline(
      [{ task: "solar-panel-detection" }],
      mapboxParams
    );
    const instance2 = await geoai.pipeline(
      [{ task: "solar-panel-detection" }],
      mapboxParams
    );

    expect(instance1).toBe(instance2);
  });

  it("should create new instances for different configurations", async () => {
    const instance1 = await geoai.pipeline(
      [{ task: "solar-panel-detection" }],
      mapboxParams
    );
    const instance2 = await geoai.pipeline(
      [{ task: "solar-panel-detection" }],
      geobaseParamsSolarPanel
    );
    expect(instance1).not.toBe(instance2);
  });

  it("should process a polygon for solar panel detection", async () => {
    const results = await solarPanelInstance.inference({
      inputs: {
        polygon: polygonSolarPannel,
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
      fileName: "solarPanelDetection.geojson",
      description:
        "result solarPanelDetection - should process a polygon for solar panel detection",
    });
  });
});
