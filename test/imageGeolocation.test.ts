import { beforeAll, describe, expect, it } from "vitest";
import { geoai } from "../src/geoai";

const MORAINE_LAKE_TEST_IMAGE =
  "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/moraine-lake.png";

describe("image-geolocation", () => {
  let testImage: Blob;

  beforeAll(async () => {
    const response = await fetch(MORAINE_LAKE_TEST_IMAGE);
    if (!response.ok)
      throw new Error(
        `Unable to fetch GeoCLIP test image (${response.status})`
      );
    testImage = await response.blob();
  }, 30_000);

  it("geolocates the GeoCLIP Moraine Lake sample with Q4 vision weights", async () => {
    const pipeline = await geoai.pipeline(
      [{ task: "image-geolocation", modelParams: { dtype: "q4" } }],
      { provider: "esri" }
    );
    const result = await pipeline.inference({
      inputs: { image: testImage, topK: 5 },
    });

    console.log({result})

    expect(result.predictions).toHaveLength(5);
    expect(result.predictions[0].score).toBeGreaterThan(0);
    // The model card's reference output places this sample at Moraine Lake, Canada.
    expect(result.predictions[0].gps[0]).toBeCloseTo(51.3274, 1);
    expect(result.predictions[0].gps[1]).toBeCloseTo(-116.1835, 1);
  }, 180_000);
});
