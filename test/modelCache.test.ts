import { describe, expect, it } from "vitest";
import { geoai, ProviderParams } from "@/geobase-ai";
import { getCacheKey, getNodeCacheDir } from "../src/models/model_utils";
import path from "path";
const fs = require("fs");

describe("ONNX model caching", () => {
  it("should store and retrieve a cached model", async () => {
    const pipeline = await geoai.pipeline(
      [{ task: "oil-storage-tank-detection" }],
      {
        provider: "mapbox",
        apiKey: "test",
      } as ProviderParams
    );

    const modelId =
      "https://huggingface.co/geobase/oil-storage-tank-detection/resolve/main/model_quantized.onnx";

    const cacheDir = getNodeCacheDir();
    const cacheKey = getCacheKey(modelId);
    const cachePath = path.join(cacheDir, `${cacheKey}.bin`);
    const metaPath = path.join(cacheDir, `${cacheKey}.meta.json`);
    const exists = fs.existsSync(cachePath) && fs.existsSync(metaPath);
    expect(exists).toBe(true);
  });

  it("should return false if model is not cached", () => {
    const modelId =
      "https://huggingface.co/geobase/oil-storage-tank-detection/resolve/main/non_existent_model.onnx";

    const cacheDir = getNodeCacheDir();
    const cacheKey = getCacheKey(modelId);
    const cachePath = path.join(cacheDir, `${cacheKey}.bin`);
    const metaPath = path.join(cacheDir, `${cacheKey}.meta.json`);

    const exists = fs.existsSync(cachePath) && fs.existsSync(metaPath);
    expect(exists).toBe(false);
  });
});
