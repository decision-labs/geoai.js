import { describe, expect, it, beforeAll } from "vitest";
import { geobaseAi } from "@/geobase-ai";
import { geobaseParams, mapboxParams, polygon, quadrants } from "./constants";
import { ObjectDetectionResults } from "@/core/types";
import {
  NMSOptions,
  OrientedObjectDetection,
} from "../src/models/oriented_object_detection";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { geoJsonToGist } from "./utils/saveToGist";

describe("test model geobase/gghl-oriented-object-detection", () => {
  let orientedObjectInstance: OrientedObjectDetection;
  const options: NMSOptions = {
    conf_thres: 0.5,
    iou_thres: 0.45,
    multi_label: true,
  };

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    orientedObjectInstance = await geobaseAi.pipeline(
      [{ task: "oriented-object-detection" }],
      mapboxParams
    );
  });

  it("should initialize a oriented object detection pipeline", async () => {
    const instance = await geobaseAi.pipeline(
      [{ task: "oriented-object-detection" }],
      mapboxParams
    );

    expect(instance).toBeInstanceOf(OrientedObjectDetection);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const instance1 = await geobaseAi.pipeline(
      [{ task: "oriented-object-detection" }],
      mapboxParams
    );
    const instance2 = await geobaseAi.pipeline(
      [{ task: "oriented-object-detection" }],
      mapboxParams
    );

    expect(instance1).toBe(instance2);
  });

  it("should create new instances for different configurations", async () => {
    const instance1 = await geobaseAi.pipeline(
      [{ task: "oriented-object-detection" }],
      mapboxParams
    );
    const instance2 = await geobaseAi.pipeline(
      [{ task: "oriented-object-detection" }],
      geobaseParams
    );
    expect(instance1).not.toBe(instance2);
  });

  it("should process a polygon for oriented object detection in each quadrant", async () => {
    for (const [quadrant, polygon] of Object.entries(quadrants)) {
      const results: ObjectDetectionResults =
        await orientedObjectInstance.inference({
          inputs: { polygon },
          postProcessingParams: { ...options },
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
        fileName: "orientedObjectDetectionMapboxQuadrants.geojson",
        description:
          "result orientedObjectDetection - should process a polygon for oriented object detection in each quadrant",
      });
    }
  });

  it("should process a polygon for oriented object detection for polygon for source geobase", async () => {
    const instance: OrientedObjectDetection = await geobaseAi.pipeline(
      [{ task: "oriented-object-detection" }],
      geobaseParams
    );

    const results: ObjectDetectionResults = await instance.inference({
      inputs: { polygon },
      postProcessingParams: { ...options },
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
      fileName: "orientedObjectDetectionGeobase.geojson",
      description:
        "result orientedObjectDetection - should process a polygon for oriented object detection for polygon for source geobase",
    });
  });
});
