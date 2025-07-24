import { describe, expect, it } from "vitest";
import { geoai, ProviderParams } from "@/geobase-ai";
import { ZeroShotObjectDetection } from "../src/models/zero_shot_object_detection";
import { GenericSegmentation } from "../src/models/generic_segmentation";
import { geobaseParamsBuilding, polygonBuilding } from "./constants";
import { geoJsonToGist } from "./utils/saveToGist";
import { InferenceParams } from "../src/core/types";

describe("@geobase-js/geoai", () => {
  it("should be an object", () => {
    expect(geoai).toBeInstanceOf(Object);
  });

  it("should have core API functions", () => {
    expect(geoai.tasks).toBeInstanceOf(Function);
    expect(geoai.models).toBeInstanceOf(Function);
    expect(geoai.pipeline).toBeInstanceOf(Function);
    expect(geoai.validateChain).toBeInstanceOf(Function);
  });

  it("should list tasks", () => {
    const tasks = geoai.tasks();
    expect(tasks).toContain("zero-shot-object-detection");
    expect(tasks).toContain("mask-generation");
    expect(tasks).toBeInstanceOf(Array);
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("should list models", () => {
    const models = geoai.models();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty("task");
    expect(models[0]).toHaveProperty("library");
    expect(models).toBeInstanceOf(Array);
  });
});

describe("Pipeline", () => {
  it("should create pipeline for valid task", async () => {
    const pipeline = await geoai.pipeline(
      [{ task: "zero-shot-object-detection" }],
      {
        provider: "mapbox",
        apiKey: "test",
      } as ProviderParams
    );

    expect(pipeline).toBeDefined();
    expect("inference" in pipeline).toBe(true);
    expect(pipeline).toBeInstanceOf(ZeroShotObjectDetection);
  });

  it("should throw error for invalid task", async () => {
    await expect(
      geoai.pipeline([{ task: "invalid-task" }], {
        provider: "mapbox",
        apiKey: "test",
      } as ProviderParams)
    ).rejects.toThrow();
  });

  it("should throw error when missing required provider params", async () => {
    await expect(
      geoai.pipeline(
        [{ task: "zero-shot-object-detection" }],
        {} as ProviderParams
      )
    ).rejects.toThrow();
  });

  it("should throw error when provider is invalid", async () => {
    await expect(
      geoai.pipeline([{ task: "zero-shot-object-detection" }], {
        provider: "invalid-provider",
        apiKey: "test",
      } as unknown as ProviderParams)
    ).rejects.toThrow();
  });
});

describe("Pipeline Chain", () => {
  it("should list valid chains", () => {
    const chains = geoai.validateChain([
      "mask-generation",
      "zero-shot-object-detection",
    ]);
    expect(chains).toBeInstanceOf(Array);
    expect(chains.length).toBeGreaterThan(0);
  });

  it("should create chain with multiple pipelines", async () => {
    const chain = await geoai.pipeline(
      [
        {
          task: "zero-shot-object-detection",
        },
        {
          task: "mask-generation",
        },
      ],
      {
        provider: "mapbox",
        apiKey: "test",
      } as ProviderParams
    );
    expect(chain).toBeDefined();
  });

  it("should throw error when chain configuration is empty", async () => {
    await expect(
      geoai.pipeline([], {
        provider: "mapbox",
        apiKey: "test",
      } as ProviderParams)
    ).rejects.toThrow();
  });

  it("should throw error when any pipeline in chain is invalid", async () => {
    await expect(
      geoai.pipeline(
        [
          {
            task: "zero-shot-object-detection",
          },
          {
            task: "invalid-task",
          },
        ],
        {
          provider: "mapbox",
          apiKey: "test",
        } as ProviderParams
      )
    ).rejects.toThrow();
  });

  it("should return detection results for valid input chain", async () => {
    const chain = await geoai.pipeline(
      [
        {
          task: "zero-shot-object-detection",
        },
        {
          task: "mask-generation",
          modelParams: {
            revision: "boxes",
          },
        },
      ],
      geobaseParamsBuilding
    );

    expect("inference" in chain).toBe(true);
    if (!("inference" in chain)) {
      throw new Error("Chain result should have inference method");
    }

    const chainInferenceInputs: InferenceParams = {
      inputs: {
        polygon: polygonBuilding,
        classLabel: "house .",
      },
    };

    const result = await chain.inference(chainInferenceInputs);

    // Check basic properties
    ["geoRawImage", "masks"].forEach(prop => {
      expect(result).toHaveProperty(prop);
    });

    const { masks } = result as { masks: { type: string; features: any[] } };
    expect(masks).toHaveProperty("type", "FeatureCollection");
    expect(masks).toHaveProperty("features");
    expect(masks.features).toBeInstanceOf(Array);

    // Save output to gist
    await geoJsonToGist({
      content: masks,
      fileName: "chainObjectDetectionandMaskGeneration.geojson",
      description:
        "result chainObjectDetectionandMaskGeneration - should return detection results for valid input chain",
    });
  });

  it("should throw error when input is invalid", async () => {
    const chain = await geoai.pipeline(
      [
        {
          task: "zero-shot-object-detection",
        },
        {
          task: "mask-generation",
          modelParams: {
            revision: "boxes",
          },
        },
      ],
      geobaseParamsBuilding
    );

    expect("inference" in chain).toBe(true);
    if (!("inference" in chain)) {
      throw new Error("Chain result should have inference method");
    }

    const chainInferenceInputs: InferenceParams = {
      inputs: {
        polygon: null,
        classLabel: "house .",
      },
    };

    await expect(chain.inference(chainInferenceInputs)).rejects.toThrow();
  });
});
