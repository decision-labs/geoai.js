import { describe, expect, it } from "vitest";
import { geobaseAi } from "../src/geobase-ai";
import { mapboxParams, quadrants } from "./constants";
import { ObjectDetection } from "../src/models/object_detection";
import { detectionsToGeoJSON } from "../src/utils/utils";
import {
  ObjectDectection,
  ObjectDetectionResults,
} from "../src/models/zero_shot_object_detection";
import { GeoRawImage } from "../src/types/images/GeoRawImage";

describe("geobaseAi.objectDetection", () => {
  it("should initialize a object detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "object-detection",
      mapboxParams,
      "mhassanch/WALDO30_yolov8m_640x640"
    );

    expect(result.instance).toBeInstanceOf(ObjectDetection);
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "object-detection",
      mapboxParams,
      "mhassanch/WALDO30_yolov8m_640x640"
    );
    const result2 = await geobaseAi.pipeline(
      "object-detection",
      mapboxParams,
      "mhassanch/WALDO30_yolov8m_640x640"
    );

    expect(result1.instance).toBe(result2.instance);
  });

  it("should throw exception for invalid model parameters", async () => {
    const invalidOptions = [
      { revision: "invalid_revision" },
      { subfolder: "invalid_subfolder" },
      { model_file_name: "invalid_model_file_name" },
      { device: "invalid_device" },
      { dtype: "invalid_dtype" },
    ];

    for (const options of invalidOptions) {
      try {
        await geobaseAi.pipeline(
          "object-detection",
          mapboxParams,
          "geobase/WALDO30_yolov8m_640x640",
          options
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toMatch(
          /Invalid dtype|Unsupported device|Could not locate file|Unauthorized access to file/
        );
      }
    }
  });

  it("should process a polygon for object detection in each quadrant", async () => {
    const { instance } = await geobaseAi.pipeline(
      "object-detection",
      mapboxParams
    );

    for (const [quadrant, polygon] of Object.entries(quadrants)) {
      const results: ObjectDetectionResults = await instance.detection(polygon);
      const geoJson = detectionsToGeoJSON(
        results.detections,
        results.geoRawImage
      );

      const geoJsonString = JSON.stringify(geoJson);
      const encodedGeoJson = encodeURIComponent(geoJsonString);
      const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;

      console.log(`View GeoJSON here: ${geojsonIoUrl}`);

      // Check basic properties
      expect(results).toHaveProperty("detections");
      expect(results).toHaveProperty("geoRawImage");

      // Check result types
      expect(results.detections).toBeInstanceOf(Array<ObjectDectection>);
      expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
    }
  });
});
