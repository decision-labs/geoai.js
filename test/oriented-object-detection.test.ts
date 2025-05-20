import { describe, expect, it, beforeAll } from "vitest";

import * as ort from "onnxruntime-web";
import { geobaseAi } from "../src/geobase-ai";
import { geobaseParams, mapboxParams, polygon, quadrants } from "./constants";
import { ObjectDetectionResults } from "../src/models/zero_shot_object_detection";
import {
  NMSOptions,
  OrientedObjectDetection,
} from "../src/models/oriented_object_detection";
import { GeoRawImage } from "../src/types/images/GeoRawImage";

describe("test model geobase/gghl-oriented-object-detection", () => {
  let orientedObjectInstance: OrientedObjectDetection;
  const options: NMSOptions = {
    conf_thres: 0.5,
    iou_thres: 0.45,
    multi_label: true,
  };

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    const result = await geobaseAi.pipeline(
      "oriented-object-detection",
      mapboxParams
    );
    orientedObjectInstance = result.instance as OrientedObjectDetection;
  });

  it("should initialize a oriented object detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "oriented-object-detection",
      mapboxParams
    );

    expect(result.instance).toBeInstanceOf(OrientedObjectDetection);
    expect(result.instance).toBeDefined();
    expect(result.instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "oriented-object-detection",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "oriented-object-detection",
      mapboxParams
    );

    expect(result1.instance).toBe(result2.instance);
  });

  it("should create new instances for different configurations", async () => {
    const result1 = await geobaseAi.pipeline(
      "oriented-object-detection",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "oriented-object-detection",
      geobaseParams
    );
    expect(result1.instance).not.toBe(result2.instance);
  });

  it("should process a polygon for oriented object detection in each quadrant", async () => {
    for (const [quadrant, polygon] of Object.entries(quadrants)) {
      const results: ObjectDetectionResults =
        await orientedObjectInstance.inference(polygon, options);

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
      const geoJsonString = JSON.stringify(results.detections);
      const encodedGeoJson = encodeURIComponent(geoJsonString);
      const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;
      console.log(`View GeoJSON for ${quadrant}: ${geojsonIoUrl}`);
    }
  });

  it("should process a polygon for oriented object detection for polygon for source geobase", async () => {
    const { instance } = await geobaseAi.pipeline(
      "oriented-object-detection",
      geobaseParams
    );

    const results: ObjectDetectionResults = await (
      instance as OrientedObjectDetection
    ).inference(polygon, options);

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
    const geoJsonString = JSON.stringify(results.detections);
    const encodedGeoJson = encodeURIComponent(geoJsonString);
    const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;
    console.log(`View GeoJSON for geobase source: ${geojsonIoUrl}`);
  });
});
