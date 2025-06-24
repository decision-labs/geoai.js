import { describe, expect, it, beforeAll } from "vitest";
import { geobaseAi } from "@/geobase-ai";
import { mapboxParams, polygon, quadrants } from "./constants";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { ZeroShotObjectDetection } from "@/models/zero_shot_object_detection";
import { geoJsonToGist } from "./utils/saveToGist";

describe("geobaseAi.zeroShotObjectDetection", () => {
  let owlvitInstance: ZeroShotObjectDetection;
  let groundingDinoInstance: ZeroShotObjectDetection;

  beforeAll(async () => {
    // Initialize instances for reuse across tests
    owlvitInstance = await geobaseAi.pipeline(
      [
        {
          task: "zero-shot-object-detection",
          modelId: "Xenova/owlvit-base-patch32",
        },
      ],
      mapboxParams
    );

    groundingDinoInstance = await geobaseAi.pipeline(
      [
        {
          task: "zero-shot-object-detection",
          modelId: "onnx-community/grounding-dino-tiny-ONNX",
          modelParams: { cache_dir: "./cache" },
        },
      ],
      mapboxParams
    );
  }, 50000);

  it("should initialize a zero-shot object detection pipeline", async () => {
    const instance = await geobaseAi.pipeline(
      [
        {
          task: "zero-shot-object-detection",
          modelId: "Xenova/owlvit-base-patch32",
        },
      ],
      mapboxParams
    );

    expect(instance).toBeInstanceOf(ZeroShotObjectDetection);
    expect(instance.inference).toBeDefined();
    expect(instance.inference).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const instance1 = await geobaseAi.pipeline(
      [
        {
          task: "zero-shot-object-detection",
          modelId: "Xenova/owlvit-base-patch32",
        },
      ],
      mapboxParams
    );
    const instance2 = await geobaseAi.pipeline(
      [
        {
          task: "zero-shot-object-detection",
          modelId: "Xenova/owlvit-base-patch32",
        },
      ],
      mapboxParams
    );

    expect(instance1).toBe(instance2);
    expect(instance1.inference).toBe(instance2.inference);
  });

  it("should create new instances for different configurations", async () => {
    const instance1 = await geobaseAi.pipeline(
      [{ task: "zero-shot-object-detection" }],
      mapboxParams
    );
    const instance2 = await geobaseAi.pipeline(
      [
        {
          task: "zero-shot-object-detection",
          modelId: "onnx-community/grounding-dino-tiny-ONNX",
          modelParams: {
            model_file_name: "model_quantized",
            cache_dir: "./cache",
          },
        },
      ],
      mapboxParams
    );
    expect(instance1).not.toBe(instance2.instance);
  });

  it("should throw exceptions for invalid model parameters", async () => {
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
          [
            {
              task: "zero-shot-object-detection",
              modelId: "onnx-community/grounding-dino-tiny-ONNX",
              modelParams: options,
            },
          ],
          mapboxParams
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toMatch(
          /Invalid dtype|Unsupported device|Could not locate file|Unauthorized access to file/
        );
      }
    }
  });

  it("should process polygons and detect objects with Grounding DINO", async () => {
    const text = ["tree."];

    for (const [quadrant, polygon] of Object.entries(quadrants)) {
      const results = await groundingDinoInstance.inference({
        inputs: { polygon, classLabel: text },
      });
      const result = Array.isArray(results) ? results[0] : results;

      // Validate GeoJSON structure
      expect(result.detections).toBeDefined();
      expect(result.detections.type).toBe("FeatureCollection");
      expect(Array.isArray(result.detections.features)).toBe(true);

      // Validate image data
      expect(result.geoRawImage).toBeInstanceOf(GeoRawImage);
      expect(result.geoRawImage.data).toBeDefined();
      expect(result.geoRawImage.width).toBeGreaterThan(0);
      expect(result.geoRawImage.height).toBeGreaterThan(0);

      // Save output to gist
      await geoJsonToGist({
        content: result.detections,
        fileName: "zeroShotODGroundingDino.geojson",
        description:
          "result zeroShotObjectDetection - should process polygons and detect objects with Grounding DINO",
      });
    }
  });

  it("should process polygons and detect multiple object types with OWL-ViT", async () => {
    const text = ["tree", "car", "vehicle", "building", "road", "person"];

    for (const [quadrant, polygon] of Object.entries(quadrants)) {
      const results = await owlvitInstance.inference({
        inputs: { polygon, classLabel: text },
      });
      const result = Array.isArray(results) ? results[0] : results;

      // Validate GeoJSON structure
      expect(result.detections).toBeDefined();
      expect(result.detections.type).toBe("FeatureCollection");
      expect(Array.isArray(result.detections.features)).toBe(true);

      // Validate image data
      expect(result.geoRawImage).toBeInstanceOf(GeoRawImage);
      expect(result.geoRawImage.data).toBeDefined();
      expect(result.geoRawImage.width).toBeGreaterThan(0);
      expect(result.geoRawImage.height).toBeGreaterThan(0);

      // Save output to gist
      await geoJsonToGist({
        content: result.detections,
        fileName: "zeroShotODOwlVitMapbox.geojson",
        description:
          "result zeroShotObjectDetection - should process polygons and detect multiple object types with OWL-ViT",
      });
    }
  });

  it("should process geobase source polygons with OWL-ViT", async () => {
    const text = ["tree", "car", "vehicle", "building", "road", "person"];
    const results = await owlvitInstance.inference({
      inputs: { polygon, classLabel: text },
    });
    const result = Array.isArray(results) ? results[0] : results;

    // Validate GeoJSON structure
    expect(result.detections).toBeDefined();
    expect(result.detections.type).toBe("FeatureCollection");
    expect(Array.isArray(result.detections.features)).toBe(true);

    // Validate image data
    expect(result.geoRawImage).toBeInstanceOf(GeoRawImage);
    expect(result.geoRawImage.data).toBeDefined();
    expect(result.geoRawImage.width).toBeGreaterThan(0);
    expect(result.geoRawImage.height).toBeGreaterThan(0);

    // Save output to gist
    await geoJsonToGist({
      content: result.detections,
      fileName: "zeroShotODOwlVitGeobase.geojson",
      description:
        "result zeroShotObjectDetection - should process geobase source polygons with OWL-ViT",
    });
  });
});
