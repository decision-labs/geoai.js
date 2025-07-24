import { describe, expect, it, beforeAll } from "vitest";
import { Geobase } from "../src/data_providers/geobase";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import {
  geobaseParams,
  geobaseParamsWetLand,
  polygonWetLand,
  polygonReturningNonSquareImage,
  polygonReturningSquareImageVertical,
} from "./constants";
import { GeobaseParams } from "../src/core/types";

describe("Geobase", () => {
  let geobase: Geobase;
  let testPolygon: GeoJSON.Feature;

  beforeAll(() => {
    geobase = new Geobase({
      projectRef: (geobaseParams as GeobaseParams).projectRef,
      cogImagery:
        "https://oin-hotosm-temp.s3.amazonaws.com/63556b6771072f000580f8cd/0/63556b6771072f000580f8ce.tif",
      apikey: (geobaseParams as GeobaseParams).apikey,
    });

    testPolygon = {
      type: "Feature",
      properties: {},
      geometry: {
        coordinates: [
          [
            [-102.32245205602885, 19.536415661502275],
            [-102.32245205602885, 19.534836349733624],
            [-102.32080637971754, 19.534836349733624],
            [-102.32080637971754, 19.536415661502275],
            [-102.32245205602885, 19.536415661502275],
          ],
        ],
        type: "Polygon",
      },
    } as GeoJSON.Feature;
  });

  it("should return a GeoRawImage when getting an image", async () => {
    const image = await geobase.getImage(testPolygon);
    expect(image).toBeInstanceOf(GeoRawImage);
  });

  it("should return image with correct dimensions", async () => {
    const image = await geobase.getImage(testPolygon);
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
  });

  it("should return image with bounds matching input polygon", async () => {
    const image = await geobase.getImage(testPolygon);
    const bounds = image.getBounds();

    // Calculate expected bounds from the polygon coordinates
    const expectedBounds = {
      north: 19.536496,
      south: 19.533907,
      east: -102.319793,
      west: -102.32254,
    };

    expect(bounds.west).toBeCloseTo(expectedBounds.west, 6);
    expect(bounds.east).toBeCloseTo(expectedBounds.east, 6);
    expect(bounds.south).toBeCloseTo(expectedBounds.south, 6);
    expect(bounds.north).toBeCloseTo(expectedBounds.north, 6);
  });

  describe("Tile URL generation", () => {
    let testGeobase: Geobase;

    beforeAll(() => {
      testGeobase = new Geobase({
        projectRef: process.env.GEOBASE_PROJECT_REF,
        apikey: "test-key",
        cogImagery: "test-imagery",
      });
    });

    it("should generate correct tile URLs", () => {
      const getTileUrl = testGeobase.getTileUrlFromTileCoords.bind(testGeobase);
      const url = getTileUrl([123, 456, 18], testGeobase);

      expect(url).toBe(
        "https://wmrosdnjsecywfkvxtrw.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/18/123/456" +
          "?url=test-imagery&apikey=test-key"
      );
    });

    it("should generate correct tile URL with bands parameter", () => {
      const getTileUrl = testGeobase.getTileUrlFromTileCoords.bind(testGeobase);
      const url = getTileUrl([123, 456, 18], testGeobase, [1, 2, 3]);

      expect(url).toBe(
        "https://wmrosdnjsecywfkvxtrw.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/18/123/456" +
          "?url=test-imagery&apikey=test-key&bidx=1&bidx=2&bidx=3"
      );
    });

    it("should generate correct tile URL with expression parameter", () => {
      const getTileUrl = testGeobase.getTileUrlFromTileCoords.bind(testGeobase);
      const expression = "(b3-b2)/(b3+b2)";
      const url = getTileUrl(
        [123, 456, 18],
        testGeobase,
        undefined,
        expression
      );

      expect(url).toBe(
        "https://wmrosdnjsecywfkvxtrw.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/18/123/456" +
          `?url=test-imagery&apikey=test-key&expression=${encodeURIComponent(expression)}`
      );
    });

    it("should generate correct tile URL with both bands and expression", () => {
      const getTileUrl = testGeobase.getTileUrlFromTileCoords.bind(testGeobase);
      const expression = "(b3-b2)/(b3+b2)";
      const url = getTileUrl([123, 456, 18], testGeobase, [3, 2], expression);

      expect(url).toBe(
        "https://wmrosdnjsecywfkvxtrw.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/18/123/456" +
          `?url=test-imagery&apikey=test-key&bidx=3&bidx=2&expression=${encodeURIComponent(expression)}`
      );
    });
  });

  describe("Image retrieval", () => {
    let geobase: Geobase;

    beforeAll(() => {
      geobase = new Geobase({
        projectRef: geobaseParamsWetLand.projectRef,
        apikey: geobaseParamsWetLand.apikey,
        cogImagery: geobaseParamsWetLand.cogImagery,
      });
    });

    it("should get image with specific bands", async () => {
      const image = await geobase.getImage(polygonWetLand, [1, 2, 3]);
      // image.save("bands_image.png"); // for debugging
      expect(image).toBeInstanceOf(GeoRawImage);
      expect(image.channels).toBe(3);
    });

    it("should get image with expression", async () => {
      const image = await geobase.getImage(
        polygonWetLand,
        undefined,
        "(b3-b2)/(b3+b2)"
      );
      expect(image).toBeInstanceOf(GeoRawImage);
      expect(image.channels).toBe(1);
    });

    it("should get image with square aspect ratio", async () => {
      const image = await geobase.getImage(
        polygonReturningNonSquareImage,
        undefined, // bands
        undefined, // expression
        16, // zoom level
        true // square
      );
      // await image.save("square_image.png"); // for debugging
      expect(image).toBeInstanceOf(GeoRawImage);
      expect(image.width).toBe(image.height);
    });

    // test with a square polygon and no zoom level argument
    it("should get image with square aspect ratio when no zoom level is provided", async () => {
      const image = await geobase.getImage(
        polygonReturningNonSquareImage,
        undefined, // bands
        undefined, // expression
        undefined, // zoom level
        true // square
      );
      expect(image).toBeInstanceOf(GeoRawImage);
      expect(image.width).toBe(image.height);
    });

    it("should get image with square aspect ratio using vertical polygon", async () => {
      const image = await geobase.getImage(
        polygonReturningSquareImageVertical,
        undefined, // bands
        undefined, // expression
        undefined, // zoom level
        true // square
      );
      expect(image).toBeInstanceOf(GeoRawImage);
      expect(image.width).toBe(image.height);
    });

    // write a negative test without passing square
    it("should not get image with square aspect ratio when not passing square", async () => {
      const image = await geobase.getImage(
        polygonReturningSquareImageVertical,
        undefined, // bands
        undefined, // expression
        undefined, // zoom level
        false // square
      );
      expect(image).toBeInstanceOf(GeoRawImage);
      expect(image.width).not.toBe(image.height);
    });
  });
});
