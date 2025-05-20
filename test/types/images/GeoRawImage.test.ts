import { describe, expect, it, beforeAll } from "vitest";
import { GeoRawImage } from "../../../src/types/images/GeoRawImage";
import { RawImage } from "@huggingface/transformers";

describe("GeoRawImage", () => {
  let width: number;
  let height: number;
  let channels: number;
  let data: Uint8ClampedArray;
  let bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  let geoImage: GeoRawImage;
  let rawImage: RawImage;

  beforeAll(() => {
    // Initialize test data
    width = 100;
    height = 100;
    channels = 3;
    data = new Uint8ClampedArray(width * height * channels);
    bounds = {
      north: 41.885379230564524,
      south: 41.884332326712524,
      east: 12.482802629103247,
      west: 12.481392196198271,
    };
    rawImage = new RawImage(data, width, height, channels);
    geoImage = new GeoRawImage(data, width, height, channels, bounds);
  });

  describe("Creation and Basic Properties", () => {
    it("should create from RawImage", () => {
      const geoImageFromRaw = GeoRawImage.fromRawImage(rawImage, bounds);

      expect(geoImageFromRaw).toBeInstanceOf(GeoRawImage);
      expect(geoImageFromRaw.width).toBe(width);
      expect(geoImageFromRaw.height).toBe(height);
      expect(geoImageFromRaw.channels).toBe(channels);
      expect(geoImageFromRaw.data).toBeDefined();
      expect(geoImageFromRaw.data.length).toBe(width * height * channels);
    });

    it("should have correct bounds", () => {
      const imageBounds = geoImage.getBounds();

      expect(imageBounds).toBeDefined();
      expect(imageBounds).toEqual(bounds);
      expect(imageBounds.north).toBe(bounds.north);
      expect(imageBounds.south).toBe(bounds.south);
      expect(imageBounds.east).toBe(bounds.east);
      expect(imageBounds.west).toBe(bounds.west);
    });

    it("should have the correct default CRS", () => {
      const crs = geoImage.getCRS();

      expect(crs).toBeDefined();
      expect(crs).toBe("EPSG:4326");
      expect(typeof crs).toBe("string");
    });
  });

  describe("Coordinate Conversion", () => {
    it("should correctly convert between pixel and world coordinates", () => {
      // Test center point conversion
      const centerPixel = [width / 2, height / 2];
      const [lon, lat] = geoImage.pixelToWorld(centerPixel[0], centerPixel[1]);
      const [x, y] = geoImage.worldToPixel(lon, lat);

      // Check that converting back and forth gives approximately the same coordinates
      expect(x).toBeCloseTo(centerPixel[0], 0);
      expect(y).toBeCloseTo(centerPixel[1], 0);

      // Test that coordinates are within bounds
      expect(lon).toBeGreaterThan(bounds.west);
      expect(lon).toBeLessThan(bounds.east);
      expect(lat).toBeGreaterThan(bounds.south);
      expect(lat).toBeLessThan(bounds.north);

      // Test corner points
      const corners = [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1],
      ];

      corners.forEach(([px, py]) => {
        const [cornerLon, cornerLat] = geoImage.pixelToWorld(px, py);
        expect(cornerLon).toBeGreaterThanOrEqual(bounds.west);
        expect(cornerLon).toBeLessThanOrEqual(bounds.east);
        expect(cornerLat).toBeGreaterThanOrEqual(bounds.south);
        expect(cornerLat).toBeLessThanOrEqual(bounds.north);
      });
    });
  });

  describe("Cloning", () => {
    it("should maintain georeferencing information when cloned", () => {
      const clonedImage = geoImage.clone();

      // Check that the clone is a GeoRawImage
      expect(clonedImage).toBeInstanceOf(GeoRawImage);
      expect(clonedImage).not.toBe(geoImage);

      // Check that bounds match
      expect(clonedImage.getBounds()).toEqual(geoImage.getBounds());
      expect(clonedImage.getBounds()).not.toBe(geoImage.getBounds());

      // Check that CRS matches
      expect(clonedImage.getCRS()).toBe(geoImage.getCRS());

      // Check that coordinate conversion gives same results
      const [lon, lat] = geoImage.pixelToWorld(50, 50);
      const [clonedLon, clonedLat] = clonedImage.pixelToWorld(50, 50);
      expect(clonedLon).toBe(lon);
      expect(clonedLat).toBe(lat);

      // Check that data is copied
      expect(clonedImage.data).not.toBe(geoImage.data);
      expect(clonedImage.data.length).toBe(geoImage.data.length);
      expect(clonedImage.width).toBe(geoImage.width);
      expect(clonedImage.height).toBe(geoImage.height);
      expect(clonedImage.channels).toBe(geoImage.channels);
    });
  });
});
