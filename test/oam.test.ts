import { describe, expect, it, beforeAll, beforeEach, vi } from "vitest";
import {
  Oam,
  buildOamItemTileUrlTemplate,
  buildOamMosaicTileUrlTemplate,
  pickBestOamItem,
  searchOamItems,
  DEFAULT_OAM_COLLECTION,
  DEFAULT_OAM_RASTER_URL,
} from "../src/data_providers/oam";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { geoai } from "@/geoai";

/** Rome area with known OAM coverage (STAC item 67826781a07cc20001818cdb). */
const ROME_ITEM_ID = "67826781a07cc20001818cdb";

const polygonRome: GeoJSON.Feature = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [12.485, 41.892],
        [12.488, 41.892],
        [12.488, 41.89],
        [12.485, 41.89],
        [12.485, 41.892],
      ],
    ],
  },
};

describe("Oam helpers", () => {
  it("builds mosaic tile URL templates", () => {
    const url = buildOamMosaicTileUrlTemplate();
    expect(url).toContain(DEFAULT_OAM_RASTER_URL);
    expect(url).toContain(`/collections/${DEFAULT_OAM_COLLECTION}/tiles/`);
    expect(url).toContain("WebMercatorQuad/{z}/{x}/{y}");
    expect(url).toContain("assets=visual");
  });

  it("builds item tile URL templates", () => {
    const url = buildOamItemTileUrlTemplate(ROME_ITEM_ID);
    expect(url).toContain(`/items/${ROME_ITEM_ID}/tiles/`);
    expect(url).toContain("{z}/{x}/{y}@1x");
  });

  it("picks the highest-resolution (lowest gsd) item", () => {
    const best = pickBestOamItem([
      { id: "a", properties: { gsd: 0.5, created: "2020-01-01T00:00:00Z" } },
      { id: "b", properties: { gsd: 0.15, created: "2019-01-01T00:00:00Z" } },
      { id: "c", properties: { gsd: 0.15, created: "2024-01-01T00:00:00Z" } },
    ]);
    expect(best?.id).toBe("c");
  });

  it("searchOamItems posts bbox to STAC search", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{ id: ROME_ITEM_ID, properties: { gsd: 0.15 } }],
      }),
    });

    const features = await searchOamItems([12.48, 41.88, 12.49, 41.89], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(features).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain("/stac/search");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.collections).toEqual(["openaerialmap"]);
    expect(body.bbox).toEqual([12.48, 41.88, 12.49, 41.89]);
  });
});

describe("Oam provider", () => {
  describe("Tile URL generation", () => {
    it("uses item template when itemId is set", () => {
      const oam = new Oam({ itemId: ROME_ITEM_ID });
      const url = oam["getTileUrlFromTileCoords"]([35041, 24355, 16], oam);
      expect(url).toContain(`/items/${ROME_ITEM_ID}/tiles/`);
      expect(url).toContain("/16/35041/24355@1x");
      expect(url).toContain("assets=visual");
    });

    it("uses mosaic template when mosaic is true", () => {
      const oam = new Oam({ mosaic: true });
      const url = oam["getTileUrlFromTileCoords"]([1, 2, 3], oam);
      expect(url).toContain("/collections/openaerialmap/tiles/");
      expect(url).toContain("/3/1/2?");
      expect(url).not.toContain("/items/");
    });
  });

  describe("resolveTileTemplate", () => {
    it("resolves via STAC search when neither mosaic nor itemId", async () => {
      const oam = new Oam();
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          features: [{ id: ROME_ITEM_ID, properties: { gsd: 0.15 } }],
        }),
      } as Response);

      const template = await oam.resolveTileTemplate(polygonRome);
      expect(template).toContain(`/items/${ROME_ITEM_ID}/tiles/`);
      expect(oam.itemId).toBe(ROME_ITEM_ID);

      fetchSpy.mockRestore();
    });

    it("falls back to mosaic when STAC returns no features", async () => {
      const oam = new Oam();
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ features: [] }),
      } as Response);

      const template = await oam.resolveTileTemplate(polygonRome);
      expect(template).toContain("/collections/openaerialmap/tiles/");
      expect(template).not.toContain("/items/");

      fetchSpy.mockRestore();
    });
  });

  describe("getImage", () => {
    let oam: Oam;
    let image: GeoRawImage;

    beforeAll(() => {
      oam = new Oam({ itemId: ROME_ITEM_ID });
    });

    beforeEach(async () => {
      image = (await oam.getImage(
        polygonRome,
        undefined,
        undefined,
        16
      )) as GeoRawImage;
    }, 60_000);

    it("should return a valid GeoRawImage from OAM item tiles", () => {
      expect(image).toBeInstanceOf(GeoRawImage);
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
      expect(image.channels).toBeGreaterThanOrEqual(3);
      expect(image.data.length).toBeGreaterThan(0);
    });

    it("should return bounds covering the input polygon", () => {
      const bounds = image.getBounds();
      const ring = (polygonRome.geometry as GeoJSON.Polygon).coordinates[0];
      const lngs = ring.map(([lng]) => lng);
      const lats = ring.map(([, lat]) => lat);

      expect(bounds.west).toBeLessThanOrEqual(Math.min(...lngs));
      expect(bounds.east).toBeGreaterThanOrEqual(Math.max(...lngs));
      expect(bounds.south).toBeLessThanOrEqual(Math.min(...lats));
      expect(bounds.north).toBeGreaterThanOrEqual(Math.max(...lats));
    });
  });

  describe("pipeline integration", () => {
    it("initializes a pipeline with provider oam", async () => {
      const pipeline = await geoai.pipeline([{ task: "object-detection" }], {
        provider: "oam",
        itemId: ROME_ITEM_ID,
      });
      expect(pipeline).toBeDefined();
      expect(typeof pipeline.inference).toBe("function");
    }, 120_000);
  });
});
