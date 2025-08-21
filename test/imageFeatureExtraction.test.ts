import { describe, expect, it, beforeAll } from "vitest";

import { geoai } from "../src/geoai";
import { geobaseParams, polygon } from "./constants";

import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { ImageFeatureExtraction } from "../src/models/image_feature_extraction";

describe("test image-feature-extraction-pipeline", () => {
  let featureExtractor: ImageFeatureExtraction;

  beforeAll(async () => {
    // Initialize instance for reuse across tests
    featureExtractor = await geoai.pipeline(
      [{ task: "image-feature-extraction" }],
      geobaseParams
    );
  }, 100000);

  it("should initialize a image feature extraction pipeline", async () => {
    const instance = await geoai.pipeline(
      [{ task: "image-feature-extraction" }],
      geobaseParams
    );

    expect(instance).toBeInstanceOf(ImageFeatureExtraction);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const instance1 = await geoai.pipeline(
      [{ task: "image-feature-extraction" }],
      geobaseParams
    );
    const instance2 = await geoai.pipeline(
      [{ task: "image-feature-extraction" }],
      geobaseParams
    );

    expect(instance1).toBe(instance2);
  });

  it("should process a polygon for image feature extraction", async () => {
    const results = await featureExtractor.inference({
      inputs: { polygon },
    });

    // Validate result shape for ImageFeatureExtractionResults
    expect(results).toHaveProperty("features");
    expect(results).toHaveProperty("similarityMatrix");
    expect(results).toHaveProperty("patchSize");
    expect(results).toHaveProperty("geoRawImage");
    expect(results).toHaveProperty("metadata");

    // features: array of patch-level vectors
    expect(Array.isArray(results.features)).toBe(true);
    results.features.forEach((f: number[]) => {
      expect(Array.isArray(f)).toBe(true);
      expect(f.length).toBeGreaterThan(0);
      f.forEach((val: number) => expect(typeof val).toBe("number"));
    });

    // similarityMatrix: square numeric matrix
    expect(Array.isArray(results.similarityMatrix)).toBe(true);
    expect(results.similarityMatrix.length).toBeGreaterThan(0);
    const n = results.similarityMatrix.length;
    results.similarityMatrix.forEach((row: number[]) => {
      expect(Array.isArray(row)).toBe(true);
      expect(row.length).toBe(n);
      row.forEach((v: number) => expect(typeof v).toBe("number"));
    });

    // patchSize
    expect(typeof results.patchSize).toBe("number");
    expect(results.patchSize).toBeGreaterThan(0);

    // geoRawImage
    expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
    expect(results.geoRawImage.data).toBeDefined();
    expect(results.geoRawImage.width).toBeGreaterThan(0);
    expect(results.geoRawImage.height).toBeGreaterThan(0);

    // metadata
    expect(results.metadata).toBeDefined();
    expect(typeof results.metadata.numPatches).toBe("number");
    expect(typeof results.metadata.featureDimensions).toBe("number");
    expect(typeof results.metadata.modelId).toBe("string");
  });
});
