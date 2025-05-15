import { describe, expect, it } from "vitest";
import { geobaseAi, ProviderParams } from "../src/geobase-ai";
import { ZeroShotObjectDetection } from "../src/models/zero_shot_object_detection";

describe("geobase-ai", () => {
  it("should be an object", () => {
    expect(geobaseAi).toBeInstanceOf(Object);
  });

  it("should have core API functions", () => {
    expect(geobaseAi.listTasks).toBeInstanceOf(Function);
    expect(geobaseAi.listModels).toBeInstanceOf(Function);
    expect(geobaseAi.pipeline).toBeInstanceOf(Function);
    expect(geobaseAi.chain).toBeInstanceOf(Function);
  });

  it("should list tasks", () => {
    const tasks = geobaseAi.listTasks();
    expect(tasks).toContain("zero-shot-object-detection");
    expect(tasks).toContain("mask-generation");
    expect(tasks).toBeInstanceOf(Array);
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("should list models", () => {
    const models = geobaseAi.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty("task");
    expect(models[0]).toHaveProperty("library");
    expect(models).toBeInstanceOf(Array);
  });
});

describe("Pipeline", () => {
  it("should create pipeline for valid task", async () => {
    const pipeline = await geobaseAi.pipeline("zero-shot-object-detection", {
      provider: "mapbox",
      apiKey: "test",
    } as ProviderParams);

    expect(pipeline).toBeDefined();
    expect(pipeline.instance).toBeInstanceOf(ZeroShotObjectDetection);
  });

  it("should throw error for invalid task", async () => {
    await expect(
      geobaseAi.pipeline("invalid-task", {
        provider: "mapbox",
        apiKey: "test",
      } as ProviderParams)
    ).rejects.toThrow();
  });

  it("should throw error when missing required provider params", async () => {
    await expect(
      geobaseAi.pipeline("zero-shot-object-detection", {} as ProviderParams)
    ).rejects.toThrow();
  });

  it("should throw error when provider is invalid", async () => {
    await expect(
      geobaseAi.pipeline("zero-shot-object-detection", {
        provider: "invalid-provider",
        apiKey: "test",
      } as unknown as ProviderParams)
    ).rejects.toThrow();
  });
});

//TODO: Add more tests for the chain function

describe.skip("Chain", () => {
  it("should create chain with multiple pipelines", async () => {
    const chain = await geobaseAi.chain([
      {
        task: "zero-shot-object-detection",
        params: {
          provider: "mapbox",
          apiKey: "test",
        } as ProviderParams,
      },
      // Add more pipeline configurations here
    ]);

    expect(chain).toBeDefined();
    expect(chain.pipelines.length).toBe(1);
    expect(chain.pipelines[0].instance).toBeInstanceOf(ZeroShotObjectDetection);
  });

  it("should throw error when chain configuration is empty", async () => {
    await expect(geobaseAi.chain([])).rejects.toThrow();
  });

  it("should throw error when any pipeline in chain is invalid", async () => {
    await expect(
      geobaseAi.chain([
        {
          task: "zero-shot-object-detection",
          params: {
            provider: "mapbox",
            apiKey: "test",
          } as ProviderParams,
        },
        {
          task: "invalid-task",
          params: {} as ProviderParams,
        },
      ])
    ).rejects.toThrow();
  });
});
