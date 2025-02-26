import { describe, expect, it } from "vitest";
import { geobaseAi } from "../src/geobase-ai";
import { GenericSegmentation } from "../src/models/generic_segmentation";
import { mapboxParams, quadrants } from "./constants";
import { maskToGeoJSON } from "../src/utils/utils";

describe("geobaseAi.genericSegmentation", () => {
  it("should initialize a segmentation pipeline", async () => {
    const result = await geobaseAi.pipeline("mask-generation", mapboxParams);
    expect(result.instance).toBeInstanceOf(GenericSegmentation);
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline("mask-generation", mapboxParams);
    const result2 = await geobaseAi.pipeline("mask-generation", mapboxParams);
    expect(result1.instance).toBe(result2.instance);
  });

  it("should create a new instance for different configurations of the model", async () => {
    const result1 = await geobaseAi.pipeline("mask-generation", mapboxParams);
    const result2 = await geobaseAi.pipeline(
      "mask-generation",
      mapboxParams,
      "Xenova/slimsam-77-uniform",
      {
        revision: "boxes",
        cache_dir: "./cache",
      }
    );
    expect(result1.instance.model).not.toBe(result2.instance.model);
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
          "mask-generation",
          mapboxParams,
          "Xenova/slimsam-77-uniform",
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

  it("should process a polygon for segmentation and generate valid GeoJSON", async () => {
    const { instance } = await geobaseAi.pipeline(
      "mask-generation",
      mapboxParams
    );

    for (const [quadrant, polygon] of Object.entries(quadrants)) {
      const input_points = [[[122, 190]]];
      const result = await (instance as GenericSegmentation).segment(
        polygon,
        input_points
      );

      // Check basic properties
      ["geoRawImage", "masks"].forEach(prop => {
        expect(result).toHaveProperty(prop);
      });

      const { geoRawImage, masks } = result;
      const maskGeoJson = maskToGeoJSON(masks, geoRawImage);
      expect(maskGeoJson).toHaveProperty("type", "FeatureCollection");
      expect(maskGeoJson).toHaveProperty("features");
      expect(maskGeoJson.features).toBeInstanceOf(Array);

      const geoJsonString = JSON.stringify(maskGeoJson);
      const encodedGeoJson = encodeURIComponent(geoJsonString);
      const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;

      console.log(`View GeoJSON here:`);
      console.log(geojsonIoUrl);
    }
  });
});
