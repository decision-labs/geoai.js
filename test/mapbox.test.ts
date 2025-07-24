import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import { Mapbox } from "../src/data_providers/mapbox";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { polygonReturningSquareImageVertical } from "./constants";
import { GeobaseError } from "../src/errors";

describe("Mapbox", () => {
  let mapbox: Mapbox;
  let testPolygon: GeoJSON.Feature;
  let image: GeoRawImage;

  beforeAll(() => {
    mapbox = new Mapbox(
      "pk.eyJ1Ijoic2FiIiwiYSI6ImNsNDE3bGR3bzB2MmczaXF5dmxpaTloNmcifQ.NQ-B8jBPtOd53tNYt42Gqw",
      "mapbox://styles/mapbox/satellite-v9"
    );
  });

  beforeEach(() => {
    testPolygon = {
      type: "Feature",
      properties: {},
      geometry: {
        coordinates: [
          [
            [12.482802629103247, 41.885379230564524],
            [12.481392196198271, 41.885379230564524],
            [12.481392196198271, 41.884332326712524],
            [12.482802629103247, 41.884332326712524],
            [12.482802629103247, 41.885379230564524],
          ],
        ],
        type: "Polygon",
      },
    } as GeoJSON.Feature;
  });

  describe("getImage", () => {
    beforeEach(async () => {
      image = await mapbox.getImage(testPolygon);
    });

    it("should return a valid GeoRawImage instance", () => {
      expect(image).toBeDefined();
      expect(image).not.toBeNull();
      expect(image).toBeInstanceOf(GeoRawImage);
    });

    it("should return image with correct dimensions and properties", () => {
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
      expect(image.channels).toBe(3); // RGB image
      expect(image.data).toBeDefined();
      expect(image.data).not.toBeNull();
      expect(image.data.length).toBeGreaterThan(0);
    });

    it("should return image with bounds matching input polygon", () => {
      const bounds = image.getBounds();
      expect(bounds).toBeDefined();
      expect(bounds).not.toBeNull();

      // calculated from the combined tiles in the mapbox.ts file
      const expectedBounds = {
        north: 41.885921,
        south: 41.883876,
        east: 12.483216,
        west: 12.480469,
      };

      expect(bounds.west).toBeCloseTo(expectedBounds.west, 6);
      expect(bounds.east).toBeCloseTo(expectedBounds.east, 6);
      expect(bounds.south).toBeCloseTo(expectedBounds.south, 6);
      expect(bounds.north).toBeCloseTo(expectedBounds.north, 6);
    });

    it("should handle invalid polygon gracefully", async () => {
      const invalidPolygon = {
        type: "Feature",
        properties: {},
        geometry: {
          coordinates: [],
          type: "Polygon",
        },
      } as GeoJSON.Feature;

      await expect(mapbox.getImage(invalidPolygon)).rejects.toThrow();
    });

    it("should throw error if tile count exceeds maximum", async () => {
      try {
        await mapbox.getImage(
          polygonReturningSquareImageVertical,
          undefined,
          undefined,
          21,
          true
        );
      } catch (error) {
        expect(error).toBeInstanceOf(GeobaseError);
        expect(error.message).toBe(
          "Requested 6724 tiles, which exceeds the maximum allowed (100)."
        );
      }
    });

    it("should not get image with square aspect ratio when not passing square", async () => {
      const image = await mapbox.getImage(
        polygonReturningSquareImageVertical,
        undefined,
        undefined,
        undefined,
        // 21,
        false
      );
      expect(image).toBeInstanceOf(GeoRawImage);
      expect(image.width).not.toBe(image.height);
    });
    it("should get image with square aspect ratio when required square is true", async () => {
      const image = await mapbox.getImage(
        polygonReturningSquareImageVertical,
        undefined,
        undefined,
        17,
        true
      );
      expect(image).toBeInstanceOf(GeoRawImage);
      expect(image.width).toBe(image.height);
    });
  });
});
