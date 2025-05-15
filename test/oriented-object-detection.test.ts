import { describe, expect, it } from "vitest";

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
  it("should initialize a oriented object detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "oriented-object-detection",
      mapboxParams
    );

    expect(result.instance).toBeInstanceOf(OrientedObjectDetection);
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

  it("should process a polygon for oriented object detection in each quadrant", async () => {
    const { instance } = await geobaseAi.pipeline(
      "oriented-object-detection",
      mapboxParams
    );
    const options: NMSOptions = {
      conf_thres: 0.5,
      iou_thres: 0.45,
      multi_label: true,
    };

    for (const [quadrant, polygon] of Object.entries(quadrants)) {
      const results: ObjectDetectionResults = await (
        instance as OrientedObjectDetection
      ).inference(polygon, options);

      const geoJsonString = JSON.stringify(results.detections);
      const encodedGeoJson = encodeURIComponent(geoJsonString);
      const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;

      console.log(`View GeoJSON here: ${geojsonIoUrl}`);

      // Check basic properties
      expect(results).toHaveProperty("detections");
      expect(results).toHaveProperty("geoRawImage");

      // Check result types
      expect(results.detections.type).toBe("FeatureCollection");
      expect(Array.isArray(results.detections.features)).toBe(true);
      expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
    }
  });

  it("should process a polygon for oriented object detection for polygon for source geobase", async () => {
    const { instance } = await geobaseAi.pipeline(
      "oriented-object-detection",
      geobaseParams
    );

    const options: NMSOptions = {
      conf_thres: 0.5,
      iou_thres: 0.45,
      multi_label: true,
    };

    const results: ObjectDetectionResults = await (
      instance as OrientedObjectDetection
    ).inference(polygon, options);

    const geoJsonString = JSON.stringify(results.detections);
    const encodedGeoJson = encodeURIComponent(geoJsonString);
    const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;

    console.log(`View GeoJSON here: ${geojsonIoUrl}`);

    // Check basic properties
    expect(results).toHaveProperty("detections");
    expect(results).toHaveProperty("geoRawImage");

    // Check result types
    expect(results.detections.type).toBe("FeatureCollection");
    expect(Array.isArray(results.detections.features)).toBe(true);
    expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
  });
});
