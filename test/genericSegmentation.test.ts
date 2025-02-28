import { describe, expect, it } from "vitest";
import { geobaseAi } from "../src/geobase-ai";
import { GenericSegmentation } from "../src/models/generic_segmentation";
import {
  geobaseParams,
  input_point,
  mapboxParams,
  polygon,
  quadrants,
  quadrants_points,
} from "./constants";
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
      const input_points = quadrants_points[quadrant];
      const result = await (instance as GenericSegmentation).segment(
        polygon,
        input_points
      );

      // Check basic properties
      ["geoRawImage", "masks"].forEach(prop => {
        expect(result).toHaveProperty(prop);
      });

      const { masks } = result;
      expect(masks).toHaveProperty("type", "FeatureCollection");
      expect(masks).toHaveProperty("features");
      expect(masks.features).toBeInstanceOf(Array);

      const geoJsonString = JSON.stringify(masks);
      const encodedGeoJson = encodeURIComponent(geoJsonString);
      const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;

      console.log(`View GeoJSON here:`);
      console.log(geojsonIoUrl);
    }
  });

  it("should process a polygon for segmentation and generate valid GeoJSON for source geobase", async () => {
    const { instance } = await geobaseAi.pipeline(
      "mask-generation",
      geobaseParams
    );

    const input_points = input_point;
    const result = await (instance as GenericSegmentation).segment(
      polygon,
      input_points
    );

    // Check basic properties
    ["geoRawImage", "masks"].forEach(prop => {
      expect(result).toHaveProperty(prop);
    });

    const { masks } = result;
    expect(masks).toHaveProperty("type", "FeatureCollection");
    expect(masks).toHaveProperty("features");
    expect(masks.features).toBeInstanceOf(Array);

    const geoJsonString = JSON.stringify(masks);
    const encodedGeoJson = encodeURIComponent(geoJsonString);
    const geojsonIoUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJson}`;

    console.log(`View GeoJSON here:`);
    console.log(geojsonIoUrl);
  });
});
