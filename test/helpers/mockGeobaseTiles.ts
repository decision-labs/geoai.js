import { RawImage } from "@huggingface/transformers";

const DEFAULT_TILE_SIZE = 256;

/** Full COG tiles (no bidx) that models expect with more than 3 bands. */
const COG_DEFAULT_CHANNELS: Record<string, number> = {
  "wetland-segmentation.tif": 4,
};

export function isMockTilesForced(): boolean {
  return process.env.GEOAI_MOCK_TILES === "1";
}

export function isMockTilesDisabled(): boolean {
  return process.env.GEOAI_MOCK_TILES === "0";
}

export function shouldMockGeobaseTileUrl(url: string): boolean {
  return url.includes(".geobase.app/");
}

export function mockChannelsFromUrl(url: string): number {
  if (/[?&]expression=/.test(url)) {
    return 1;
  }

  const bidxCount = (url.match(/[?&]bidx=\d+/g) || []).length;
  if (bidxCount > 0) {
    return bidxCount;
  }

  for (const [cog, channels] of Object.entries(COG_DEFAULT_CHANNELS)) {
    if (url.includes(cog)) {
      return channels;
    }
  }

  return 3;
}

export function createMockGeobaseTile(
  url: string,
  size: number = DEFAULT_TILE_SIZE
): RawImage {
  const channels = mockChannelsFromUrl(url);
  const data = new Uint8ClampedArray(size * size * channels);
  data.fill(128);
  return new RawImage(data, size, size, channels);
}

export function redactTileUrl(url: string): string {
  return url.replace(/([?&]apikey=)[^&]+/gi, "$1[REDACTED]");
}
