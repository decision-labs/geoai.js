import { describe, expect, it, beforeAll } from "vitest";
import { geobaseAi } from "../src/geobase-ai";
import { geobaseParams, mapboxParams, polygon, quadrants } from "./constants";
import { ObjectDetection } from "../src/models/object_detection";
// import { detectionsToGeoJSON } from "../src/utils/utils";
import { ObjectDetectionResults } from "@/core/types";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { geoJsonToGist } from "./utils/saveToGist";

describe("geobaseAi.objectDetection", () => {
  let objectDetectionInstance: ObjectDetection;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    objectDetectionInstance = await geobaseAi.pipeline(
      [
        {
          task: "object-detection",
          modelId: "geobase/WALDO30_yolov8m_640x640",
        },
      ],
      mapboxParams
    );
  });

  it("should initialize a object detection pipeline", async () => {
    const instance = await geobaseAi.pipeline(
      [
        {
          task: "object-detection",
          modelId: "geobase/WALDO30_yolov8m_640x640",
        },
      ],
      mapboxParams
    );

    expect(instance).toBeInstanceOf(ObjectDetection);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const instance1 = await geobaseAi.pipeline(
      [
        {
          task: "object-detection",
          modelId: "geobase/WALDO30_yolov8m_640x640",
        },
      ],
      mapboxParams
    );
    const instance2 = await geobaseAi.pipeline(
      [
        {
          task: "object-detection",
          modelId: "geobase/WALDO30_yolov8m_640x640",
        },
      ],
      mapboxParams
    );

    expect(instance1).toBe(instance2);
  });

  it("should create new instances for different configurations", async () => {
    const instance1 = await geobaseAi.pipeline(
      [{ task: "object-detection" }],
      mapboxParams
    );
    const instance2 = await geobaseAi.pipeline(
      [{ task: "object-detection" }],
      geobaseParams
    );
    expect(instance1).not.toBe(instance2);
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
          [
            {
              task: "object-detection",
              modelId: "geobase/WALDO30_yolov8m_640x640",
              modelParams: options,
            },
          ],
          mapboxParams
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
