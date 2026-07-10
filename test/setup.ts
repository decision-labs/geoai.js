import { vi } from "vitest";
import {
  createMockGeobaseTile,
  isMockTilesDisabled,
  isMockTilesForced,
  redactTileUrl,
  shouldMockGeobaseTileUrl,
} from "./helpers/mockGeobaseTiles";

vi.mock("@huggingface/transformers", async importOriginal => {
  const actual =
    await importOriginal<typeof import("@huggingface/transformers")>();
  const originalLoadImage = actual.load_image.bind(actual);

  return {
    ...actual,
    load_image: async (url: string | URL, ...args: unknown[]) => {
      const urlStr = String(url);

      if (
        !isMockTilesDisabled() &&
        isMockTilesForced() &&
        shouldMockGeobaseTileUrl(urlStr)
      ) {
        return createMockGeobaseTile(urlStr);
      }

      try {
        return await originalLoadImage(url, ...args);
      } catch (error) {
        if (!isMockTilesDisabled() && shouldMockGeobaseTileUrl(urlStr)) {
          console.warn(
            `[geoai:test] Using mock tile because tile fetch failed: ${redactTileUrl(urlStr)}`
          );
          return createMockGeobaseTile(urlStr);
        }
        throw error;
      }
    },
  };
});
