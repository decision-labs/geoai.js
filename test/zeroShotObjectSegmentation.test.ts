import { describe, expect, it } from "vitest";
import { geobaseAi } from "../src/geobase-ai";
import {
  geobaseParamsBuilding,
  mapboxParams,
  polygon,
  polygonBuilding,
} from "./constants";
import { ZeroShotObjectSegmentation } from "../src/models/zero_shot_object_segmentation";

describe("geobaseAi.genericSegmentation", () => {
  it("should process a polygon for segmentation and generate valid GeoJSON for source geobase with boxes", async () => {
    const { instance } = await geobaseAi.pipeline(
      "zero-shot-object-segmentation",
      geobaseParamsBuilding
    );

    const result = await (
      instance as ZeroShotObjectSegmentation
    ).detect_and_segment(polygonBuilding, "house .");

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
