import { describe, expect, it } from "vitest";
import {
  createMockGeobaseTile,
  mockChannelsFromUrl,
  shouldMockGeobaseTileUrl,
} from "./helpers/mockGeobaseTiles";

describe("mockGeobaseTiles", () => {
  it("detects geobase tile URLs", () => {
    expect(
      shouldMockGeobaseTileUrl(
        "https://example.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/18/1/2"
      )
    ).toBe(true);
    expect(
      shouldMockGeobaseTileUrl(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/1/2/3"
      )
    ).toBe(false);
  });

  it("creates a mock RGB tile by default", () => {
    const image = createMockGeobaseTile(
      "https://example.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/18/1/2?url=test&apikey=test"
    );

    expect(image.width).toBe(256);
    expect(image.height).toBe(256);
    expect(image.channels).toBe(3);
  });

  it("creates a single-channel mock tile for expression URLs", () => {
    const url =
      "https://example.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/18/1/2?url=test&apikey=test&expression=(b3-b2)%2F(b3%2Bb2)";

    expect(mockChannelsFromUrl(url)).toBe(1);
    expect(createMockGeobaseTile(url).channels).toBe(1);
  });
});
