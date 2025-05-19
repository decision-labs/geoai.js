import { describe, expect, it, beforeAll } from "vitest";
import { Mapbox } from "../src/data_providers/mapbox";
import { GeoRawImage } from "../src/types/images/GeoRawImage";

describe("Mapbox", () => {
  let mapbox: Mapbox;
  let testPolygon: GeoJSON.Feature;
  let image: GeoRawImage;

  beforeAll(() => {
    mapbox = new Mapbox(
      "pk.eyJ1Ijoic2FiIiwiYSI6ImNsNDE3bGR3bzB2MmczaXF5dmxpaTloNmcifQ.NQ-B8jBPtOd53tNYt42Gqw",
      "mapbox://styles/mapbox/satellite-v9"
    );

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
    beforeAll(async () => {
      image = await mapbox.getImage(testPolygon);
    });

    it("should return a GeoRawImage instance", () => {
      expect(image).toBeInstanceOf(GeoRawImage);
    });

    it("should return image with correct dimensions", () => {
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
      expect(image.channels).toBe(3); // RGB image
    });

    it("should return image with bounds matching input polygon", () => {
      const bounds = image.getBounds();

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
  });
});
