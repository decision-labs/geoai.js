import { describe, expect, it, beforeAll } from "vitest";
import { GeoRawImage } from "../../../src/types/images/GeoRawImage";
import { RawImage } from "@huggingface/transformers";

describe("GeoRawImage", () => {
  let width: number;
  let height: number;
  let channels: 2 | 1 | 3 | 4;
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

  describe("toPatches", () => {
    it("should return 2d array of georawimage patches", async () => {
      const patchHeight = 20;
      const patchWidth = 20;
      const patches = await geoImage.toPatches(patchHeight, patchWidth);

      // Should be a 2D array
      expect(Array.isArray(patches)).toBe(true);
      expect(Array.isArray(patches[0])).toBe(true);

      // Calculate expected number of rows and columns
      const expectedRows = Math.ceil(geoImage.height / patchHeight);
      const expectedCols = Math.ceil(geoImage.width / patchWidth);

      expect(patches.length).toBe(expectedRows);
      patches.forEach(row => {
        expect(Array.isArray(row)).toBe(true);
        expect(row.length).toBe(expectedCols);
      });

      // All patches should be GeoRawImage and have correct dimensions
      // Also construct a GeoJSON FeatureCollection of patch bounds
      const features: GeoJSON.Feature[] = [];
      for (let i = 0; i < expectedRows; i++) {
        for (let j = 0; j < expectedCols; j++) {
          const patch = patches[i][j];
          expect(patch).toBeInstanceOf(GeoRawImage);

          // Patch size: last row/col may be smaller if not padded, but default is padded
          const isLastRow = i === expectedRows - 1;
          const isLastCol = j === expectedCols - 1;
          const expectedPatchHeight = patchHeight;
          const expectedPatchWidth = patchWidth;

          expect(patch.height).toBe(expectedPatchHeight);
          expect(patch.width).toBe(expectedPatchWidth);

          // CRS and bounds should be present
          expect(patch.getCRS()).toBe(geoImage.getCRS());
          const bounds = patch.getBounds();
          expect(bounds).toHaveProperty("north");
          expect(bounds).toHaveProperty("south");
          expect(bounds).toHaveProperty("east");
          expect(bounds).toHaveProperty("west");

          // Add patch bounds as a GeoJSON Polygon feature
          features.push({
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [bounds.west, bounds.north], // top-left
                  [bounds.east, bounds.north], // top-right
                  [bounds.east, bounds.south], // bottom-right
                  [bounds.west, bounds.south], // bottom-left
                  [bounds.west, bounds.north], // close polygon
                ],
              ],
            },
            properties: {
              row: i,
              col: j,
            },
          });
        }
      }
      const patchFeatureCollection = {
        type: "FeatureCollection",
        features,
      };
      // Check that all patch polygons are within the original image bounds
      const origBounds = geoImage.getBounds();
      for (const feature of patchFeatureCollection.features) {
        const coords = feature.geometry.coordinates[0];
        for (const [lon, lat] of coords) {
          expect(lon).toBeGreaterThanOrEqual(origBounds.west - 1e-8);
          expect(lon).toBeLessThanOrEqual(origBounds.east + 1e-8);
          expect(lat).toBeLessThanOrEqual(origBounds.north + 1e-8);
          expect(lat).toBeGreaterThanOrEqual(origBounds.south - 1e-8);
        }
      }
      // Bottom-right patch's bottom-right pixel should match original image's bottom-right
      const lastRow = patches.length - 1;
      const lastCol = patches[0].length - 1;
      const lastPatch = patches[lastRow][lastCol];
      expect(lastPatch.getBounds().east).toBeCloseTo(
        geoImage.getBounds().east,
        6
      );
      expect(lastPatch.getBounds().south).toBeCloseTo(
        geoImage.getBounds().south,
        6
      );
    });

    it("should not pad if padding is false", async () => {
      const patchHeight = 33;
      const patchWidth = 33;
      const patches = await geoImage.toPatches(patchHeight, patchWidth, {
        padding: false,
      });

      // Should be a 2D array
      expect(Array.isArray(patches)).toBe(true);
      expect(Array.isArray(patches[0])).toBe(true);

      // Calculate expected number of rows and columns (no padding)
      const expectedRows = Math.ceil(geoImage.height / patchHeight);
      const expectedCols = Math.ceil(geoImage.width / patchWidth);

      expect(patches.length).toBe(expectedRows);
      patches.forEach(row => {
        expect(Array.isArray(row)).toBe(true);
        expect(row.length).toBe(expectedCols);
      });

      // Last patch in each row/col may be smaller
      for (let i = 0; i < expectedRows; i++) {
        for (let j = 0; j < expectedCols; j++) {
          const patch = patches[i][j];
          expect(patch).toBeInstanceOf(GeoRawImage);

          const isLastRow = i === expectedRows - 1;
          const isLastCol = j === expectedCols - 1;
          const expectedPatchHeight = isLastRow
            ? geoImage.height - patchHeight * (expectedRows - 1)
            : patchHeight;
          const expectedPatchWidth = isLastCol
            ? geoImage.width - patchWidth * (expectedCols - 1)
            : patchWidth;

          expect(patch.height).toBe(expectedPatchHeight);
          expect(patch.width).toBe(expectedPatchWidth);
        }
      }
    });
  });
});
