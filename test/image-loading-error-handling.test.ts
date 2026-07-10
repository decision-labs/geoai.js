import { describe, it, expect, vi, beforeEach } from "vitest";
import { getImageFromTiles } from "../src/data_providers/common";
import { GeobaseError, ErrorType } from "../src/errors";

const mockLoadImage = vi.fn();

vi.mock("@huggingface/transformers", async importOriginal => {
  const actual =
    await importOriginal<typeof import("@huggingface/transformers")>();
  return {
    ...actual,
    load_image: (...args: unknown[]) => mockLoadImage(...args),
  };
});

const tilesGrid = (urls: string[]) => [
  urls.map((tileUrl, x) => ({
    tile: [x, 0, 10],
    tileUrl,
    tileGeoJson: {
      bbox: [x, 0, x + 1, 1],
    },
  })),
];

describe("Image Loading Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw GeobaseError when all tiles fail to load", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockLoadImage.mockRejectedValue(new Error("network error"));

    await expect(
      getImageFromTiles(
        tilesGrid(["https://example.com/a.png", "https://example.com/b.png"]),
        true
      )
    ).rejects.toMatchObject({
      type: ErrorType.ImageLoadFailed,
      code: 1004,
    });

    warnSpy.mockRestore();
  });

  it("should throw GeobaseError with correct error type when all tiles fail", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockLoadImage.mockRejectedValue(new Error("tile unavailable"));

    try {
      await getImageFromTiles(
        tilesGrid(["https://example.com/missing.png"]),
        true
      );
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

  it("should continue when some tiles fail but at least one succeeds", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockLoadImage
      .mockRejectedValueOnce(new Error("missing tile"))
      .mockResolvedValueOnce({
        width: 256,
        height: 256,
        channels: 3,
        data: new Uint8ClampedArray(256 * 256 * 3),
      } as Awaited<ReturnType<typeof mockLoadImage>>);

    const result = await getImageFromTiles(
      tilesGrid([
        "https://example.com/missing.png",
        "https://example.com/ok.png",
      ]),
      true
    );

    expect(result).toBeDefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load 1 out of 2 tiles")
    );

    warnSpy.mockRestore();
  });
});
