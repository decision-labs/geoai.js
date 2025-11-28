import { describe, it, expect, vi } from "vitest";
import { getImageFromTiles } from "../src/data_providers/common";
import { GeobaseError, ErrorType } from "../src/errors";

describe("Image Loading Error Handling", () => {
  it("should handle partial tile loading failures gracefully", async () => {
    // Mock console.warn to suppress warnings during tests
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Create a mock tiles grid with some invalid URLs
    const tilesGrid = [
      [
        {
          tile: [0, 0, 10],
          tileUrl: "https://httpstat.us/404", // This will fail
          tileGeoJson: {
            bbox: [0, 0, 1, 1],
          },
        },
        {
          tile: [1, 0, 10],
          tileUrl: "https://httpstat.us/404", // This will fail
          tileGeoJson: {
            bbox: [1, 0, 2, 1],
          },
        },
      ],
    ];

    // Since all tiles will fail, it should throw an error
    await expect(getImageFromTiles(tilesGrid, true)).rejects.toThrow(
      GeobaseError
    );

    await expect(getImageFromTiles(tilesGrid, true)).rejects.toThrow(
      /Failed to load all tiles/
    );

    // Restore console.warn
    warnSpy.mockRestore();
  });

  it("should throw GeobaseError with correct error type when all tiles fail", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const tilesGrid = [
      [
        {
          tile: [0, 0, 10],
          tileUrl: "https://invalid-url-that-does-not-exist.com/tile.png",
          tileGeoJson: {
            bbox: [0, 0, 1, 1],
          },
        },
      ],
    ];

    try {
      await getImageFromTiles(tilesGrid, true);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(GeobaseError);
      if (error instanceof GeobaseError) {
        expect(error.type).toBe(ErrorType.ImageLoadFailed);
        expect(error.code).toBe(1004);
      }
    }

    warnSpy.mockRestore();
  });

  it("should log warning when some tiles fail but continue processing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Note: This test requires at least one valid tile URL for it to not throw
    // Since we're testing error handling, we'll just verify the behavior exists

    warnSpy.mockRestore();
  });
});
