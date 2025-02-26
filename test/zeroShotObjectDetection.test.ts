import { describe, expect, it } from "vitest";
import { geobaseAi } from "../src/geobase-ai";
import { mapboxParams, quadrants } from "./constants";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import {
  ObjectDectection,
  ObjectDetectionResults,
  ZeroShotObjectDetection,
} from "../src/models/zero_shot_object_detection";
import { detectionsToGeoJSON } from "../src/utils/utils";

describe("geobaseAi.zeroShotObjectDetection", () => {
  it("should initialize a zero-shot object detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams,
      "Xenova/owlvit-base-patch32"
    );

    expect(result.instance).toBeInstanceOf(ZeroShotObjectDetection);
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams,
      "Xenova/owlvit-base-patch32"
    );
    const result2 = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams,
      "Xenova/owlvit-base-patch32"
    );

    expect(result1.instance).toBe(result2.instance);
  });

  it("should create a new instance for different configurations of onnx-community/grounding-dino-tiny-ONNX", async () => {
    const result1 = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams
    );
    const result2 = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams,
      "onnx-community/grounding-dino-tiny-ONNX",
      { model_file_name: "model_quantized", cache_dir: "./cache" }
    );
    expect(result1.instance.detector).not.toBe(result2.instance.detector);
  });

  it("should throw exception for invalid model parameters for model onnx-community/grounding-dino-tiny-ONNX", async () => {
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
          "zero-shot-object-detection",
          mapboxParams,
          "onnx-community/grounding-dino-tiny-ONNX",
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

  it("should process a polygon for object detection using onnx-community/grounding-dino-tiny-ONNX", async () => {
    const { instance } = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams,
      "onnx-community/grounding-dino-tiny-ONNX",
      { model_file_name: "model_quantized", cache_dir: "./cache" }
    );

    const text = ["tree."];

    for (const [quadrant, polygon] of Object.entries(quadrants)) {
      const results: ObjectDetectionResults = await (
        instance as ZeroShotObjectDetection
      ).detection(polygon, text);

      let result = results;

      // model can potentially return an array if multiple images are processed
      if (Array.isArray(results)) result = results[0];

      const geoJson = detectionsToGeoJSON(
        results?.detections,
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

  it("should create a new instance for different configurations of Xennova/owlvit-base-patch32", async () => {
    const result1 = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams,
      "Xenova/owlvit-base-patch32"
    );
    const result2 = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams,
      "Xenova/owlvit-base-patch32",
      { model_file_name: "model_quantized", cache_dir: "./cache" }
    );
    expect(result1.instance.detector).not.toBe(result2.instance.detector);
  });

  it("should throw exception for invalid model parameters for model Xennova/owlvit-base-patch32", async () => {
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
          "zero-shot-object-detection",
          mapboxParams,
          "Xennova/owlvit-base-patch32",
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

  it("should process a polygon for object detection using Xennova/owlvit-base-patch32", async () => {
    const { instance } = await geobaseAi.pipeline(
      "zero-shot-object-detection",
      mapboxParams,
      "Xenova/owlvit-base-patch32"
    );

    const text = ["tree", "car", "vehicle", "building", "road", "person"];

    for (const [quadrant, polygon] of Object.entries(quadrants)) {
      const results: ObjectDetectionResults = await (
        instance as ZeroShotObjectDetection
      ).detection(polygon, text);

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
