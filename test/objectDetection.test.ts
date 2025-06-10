import { describe, expect, it, beforeAll } from "vitest";
import { geobaseAi } from "../src/geobase-ai";
import { geobaseParams, mapboxParams, polygon, quadrants } from "./constants";
import { ObjectDetection } from "../src/models/object_detection";
import { detectionsToGeoJSON } from "../src/utils/utils";
import { ObjectDetectionResults } from "../src/models/zero_shot_object_detection";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { geoJsonToGist } from "./utils/saveToGist";

describe("geobaseAi.objectDetection", () => {
  let objectDetectionInstance: ObjectDetection;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    const result = await geobaseAi.pipeline(
      "object-detection",
      mapboxParams,
      "geobase/WALDO30_yolov8m_640x640"
    );
    objectDetectionInstance = result.instance as ObjectDetection;
  });

  it("should initialize a object detection pipeline", async () => {
    const result = await geobaseAi.pipeline(
      "object-detection",
      mapboxParams,
      "geobase/WALDO30_yolov8m_640x640"
    );

    expect(result.instance).toBeInstanceOf(ObjectDetection);
    expect(result.instance).toBeDefined();
    expect(result.instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline(
      "object-detection",
      mapboxParams,
      "geobase/WALDO30_yolov8m_640x640"
    );
    const result2 = await geobaseAi.pipeline(
      "object-detection",
      mapboxParams,
      "geobase/WALDO30_yolov8m_640x640"
    );

    expect(result1.instance).toBe(result2.instance);
    expect(result1.instance.detector).toBe(result2.instance.detector);
  });

  it("should create new instances for different configurations", async () => {
    const result1 = await geobaseAi.pipeline("object-detection", mapboxParams);
    const result2 = await geobaseAi.pipeline("object-detection", geobaseParams);
    expect(result1.instance).not.toBe(result2.instance);
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
      await expect(
        geobaseAi.pipeline(
          "object-detection",
          mapboxParams,
          "geobase/WALDO30_yolov8m_640x640",
          options
        )
      ).rejects.toThrow();
    }
  });

  it("should process a polygon for object detection in each quadrant", async () => {
    for (const [quadrant, polygon] of Object.entries(quadrants)) {
      const results: ObjectDetectionResults =
        await objectDetectionInstance.inference({
          inputs: {
            polygon,
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
        fileName: "objectDetectionMapbox.geojson",
        description:
          "result objectDetectionMapbox - should process a polygon for object detection in each quadrant",
      });
    }
  });

  it("should process a polygon for object detection for source geobase", async () => {
    const results: ObjectDetectionResults =
      await objectDetectionInstance.inference({
        inputs: {
          polygon,
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
      fileName: "objectDetectionGeobase.geojson",
      description:
        "result objectDetectionMapbox - should process a polygon for object detection for source geobase",
    });
  });
});
