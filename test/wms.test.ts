import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import {
  Wms,
  buildWmsGetMapUrl,
  formatWmsBbox,
  getTileBbox,
} from "../src/data_providers/wms";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import {
  NRW_DOP_WMS_URL,
  NRW_DOP_LAYER,
  NRW_DOP_ATTRIBUTION,
  polygonCologne,
  wmsNrwDopParams,
} from "./nrwWms";

describe("Wms", () => {
  let wms: Wms;
  let testPolygon: GeoJSON.Feature;
  let image: GeoRawImage;

  beforeAll(() => {
    wms = new Wms({
      baseUrl: wmsNrwDopParams.baseUrl,
      layers: wmsNrwDopParams.layers,
      version: wmsNrwDopParams.version,
      crs: wmsNrwDopParams.crs,
      attribution: NRW_DOP_ATTRIBUTION,
    });
  });

  beforeEach(() => {
    testPolygon = polygonCologne;
  });

  describe("getImage", () => {
    beforeEach(async () => {
      image = (await wms.getImage(
        testPolygon,
        undefined,
        undefined,
        17
      )) as GeoRawImage;
    });

    it("should return a valid GeoRawImage instance", () => {
      expect(image).toBeDefined();
      expect(image).not.toBeNull();
      expect(image).toBeInstanceOf(GeoRawImage);
    });

    it("should return image with correct dimensions and properties", () => {
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
      expect(image.channels).toBe(3);
      expect(image.data).toBeDefined();
      expect(image.data).not.toBeNull();
      expect(image.data.length).toBeGreaterThan(0);
    });

    it("should return image with bounds matching input polygon", () => {
      const bounds = image.getBounds();
      expect(bounds).toBeDefined();
      expect(bounds).not.toBeNull();

      const ring = (testPolygon.geometry as GeoJSON.Polygon).coordinates[0];
      const lngs = ring.map(([lng]) => lng);
      const lats = ring.map(([, lat]) => lat);

      expect(bounds.west).toBeLessThanOrEqual(Math.min(...lngs));
      expect(bounds.east).toBeGreaterThanOrEqual(Math.max(...lngs));
      expect(bounds.south).toBeLessThanOrEqual(Math.min(...lats));
      expect(bounds.north).toBeGreaterThanOrEqual(Math.max(...lats));
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

      await expect(wms.getImage(invalidPolygon)).rejects.toThrow();
    });
  });

  describe("GetMap URL generation", () => {
    const sampleTile: [number, number, number] = [34313, 21162, 16];

    it("should build WMS 1.3.0 GetMap URLs with EPSG:3857 for NRW DOP", () => {
      const url = buildWmsGetMapUrl(
        {
          baseUrl: NRW_DOP_WMS_URL,
          layers: NRW_DOP_LAYER,
          version: "1.3.0",
          crs: "EPSG:3857",
        },
        sampleTile
      );

      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe(NRW_DOP_WMS_URL);
      expect(parsed.searchParams.get("SERVICE")).toBe("WMS");
      expect(parsed.searchParams.get("REQUEST")).toBe("GetMap");
      expect(parsed.searchParams.get("VERSION")).toBe("1.3.0");
      expect(parsed.searchParams.get("LAYERS")).toBe(NRW_DOP_LAYER);
      expect(parsed.searchParams.get("CRS")).toBe("EPSG:3857");
      expect(parsed.searchParams.get("SRS")).toBeNull();
      expect(parsed.searchParams.get("WIDTH")).toBe("256");
      expect(parsed.searchParams.get("HEIGHT")).toBe("256");
      expect(parsed.searchParams.get("FORMAT")).toBe("image/png");
      expect(parsed.searchParams.get("BBOX")).toBeTruthy();
    });

    it("should build WMS 1.1.1 GetMap URLs with SRS parameter", () => {
      const url = buildWmsGetMapUrl(
        {
          baseUrl: "https://example.com/wms",
          layers: "topografic",
          version: "1.1.1",
          crs: "EPSG:3857",
        },
        sampleTile
      );

      const parsed = new URL(url);
      expect(parsed.searchParams.get("VERSION")).toBe("1.1.1");
      expect(parsed.searchParams.get("SRS")).toBe("EPSG:3857");
      expect(parsed.searchParams.get("CRS")).toBeNull();
      expect(parsed.searchParams.get("LAYERS")).toBe("topografic");
    });

    it("should use latitude-longitude axis order for WMS 1.3.0 EPSG:4326", () => {
      const bbox: [number, number, number, number] = [6.95, 50.94, 6.96, 50.95];
      expect(formatWmsBbox(bbox, "EPSG:4326", "1.3.0")).toBe(
        "50.94,6.95,50.95,6.96"
      );
    });

    it("should keep minX,minY,maxX,maxY order for projected CRS", () => {
      const bbox: [number, number, number, number] = [
        774500, 5708000, 777000, 5710500,
      ];
      expect(formatWmsBbox(bbox, "EPSG:3857", "1.3.0")).toBe(
        "774500,5708000,777000,5710500"
      );
      expect(formatWmsBbox(bbox, "EPSG:3857", "1.1.1")).toBe(
        "774500,5708000,777000,5710500"
      );
    });

    it("should include transparent and extra query parameters", () => {
      const url = buildWmsGetMapUrl(
        {
          baseUrl: "https://example.com/wms",
          layers: "layer1",
          transparent: true,
          extraParams: { token: "abc123" },
        },
        sampleTile
      );

      const parsed = new URL(url);
      expect(parsed.searchParams.get("TRANSPARENT")).toBe("TRUE");
      expect(parsed.searchParams.get("token")).toBe("abc123");
    });

    it("should respect custom tile size in WIDTH and HEIGHT", () => {
      const url = buildWmsGetMapUrl(
        {
          baseUrl: "https://example.com/wms",
          layers: "layer1",
          tileSize: 512,
        },
        sampleTile
      );

      const parsed = new URL(url);
      expect(parsed.searchParams.get("WIDTH")).toBe("512");
      expect(parsed.searchParams.get("HEIGHT")).toBe("512");
    });

    it("should derive EPSG:3857 bbox from Web Mercator tile coordinates", () => {
      const bbox = getTileBbox(sampleTile, "EPSG:3857", 256);
      expect(bbox[0]).toBeLessThan(bbox[2]);
      expect(bbox[1]).toBeLessThan(bbox[3]);
      expect(bbox[1]).toBeGreaterThan(0);
      expect(bbox.every(value => Number.isFinite(value))).toBe(true);
    });
  });

  describe("Configuration", () => {
    it("should use sensible defaults", () => {
      const instance = new Wms({
        baseUrl: "https://example.com/wms",
        layers: "layer1",
      });

      expect(instance.version).toBe("1.1.1");
      expect(instance.crs).toBe("EPSG:3857");
      expect(instance.format).toBe("image/png");
      expect(instance.styles).toBe("");
      expect(instance.transparent).toBe(false);
      expect(instance.tileSize).toBe(256);
      expect(instance.attribution).toBe("WMS Provider");
    });

    it("should store custom headers", () => {
      const instance = new Wms({
        baseUrl: "https://example.com/wms",
        layers: "layer1",
        headers: {
          Authorization: "Bearer token123",
        },
      });

      expect(instance.headers).toEqual({
        Authorization: "Bearer token123",
      });
    });
  });
});
