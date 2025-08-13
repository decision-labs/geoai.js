import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import { Esri } from "../src/data_providers/esri";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import { polygonReturningSquareImageVertical } from "./constants";

describe("Esri", () => {
  let esri: Esri;
  let testPolygon: GeoJSON.Feature;
  let image: GeoRawImage;

  beforeAll(() => {
    esri = new Esri({
      serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
      serviceName: "World_Imagery",
      tileSize: 256,
      attribution: "ESRI World Imagery",
    });
  });

  beforeEach(() => {
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
    beforeEach(async () => {
      image = await esri.getImage(testPolygon);
    });

    it("should return a valid GeoRawImage instance", () => {
      expect(image).toBeDefined();
      expect(image).not.toBeNull();
      expect(image).toBeInstanceOf(GeoRawImage);
    });

    it("should return image with correct dimensions and properties", () => {
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
      expect(image.channels).toBe(3); // RGB image
      expect(image.data).toBeDefined();
      expect(image.data).not.toBeNull();
      expect(image.data.length).toBeGreaterThan(0);
    });

    it("should return image with bounds matching input polygon", () => {
      const bounds = image.getBounds();
      expect(bounds).toBeDefined();
      expect(bounds).not.toBeNull();

      // Expected bounds for the test polygon
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

    it("should handle invalid polygon gracefully", async () => {
      const invalidPolygon = {
        type: "Feature",
        properties: {},
        geometry: {
          coordinates: [],
          type: "Polygon",
        },
      } as GeoJSON.Feature;

      await expect(esri.getImage(invalidPolygon)).rejects.toThrow();
    });
  });

  describe("Tile URL generation", () => {
    let testEsri: Esri;

    beforeAll(() => {
      testEsri = new Esri({
        serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
        serviceName: "World_Imagery",
        tileSize: 256,
        attribution: "ESRI World Imagery",
      });
    });

    it("should generate correct tile URLs", () => {
      const getTileUrl = testEsri.getTileUrlFromTileCoords.bind(testEsri);
      const url = getTileUrl([123, 456, 18], testEsri);

      expect(url).toBe(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/456/123"
      );
    });

    it("should handle different service configurations", () => {
      const customEsri = new Esri({
        serviceUrl: "https://services.arcgisonline.com/ArcGIS/rest/services",
        serviceName: "World_Topo_Map",
        tileSize: 256,
        attribution: "ESRI World Topo Map",
      });

      const getTileUrl = customEsri.getTileUrlFromTileCoords.bind(customEsri);
      const url = getTileUrl([100, 200, 15], customEsri);

      expect(url).toBe(
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/15/200/100"
      );
    });

    it("should handle custom tile size", () => {
      const customEsri = new Esri({
        serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
        serviceName: "World_Imagery",
        tileSize: 512,
        attribution: "ESRI World Imagery",
      });

      expect(customEsri.tileSize).toBe(512);
    });
  });

  describe("Configuration", () => {
    it("should accept valid configuration", () => {
      const config = {
        serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
        serviceName: "World_Imagery",
        tileSize: 256,
        attribution: "ESRI World Imagery",
      };

      const esriInstance = new Esri(config);
      expect(esriInstance.serviceUrl).toBe(config.serviceUrl);
      expect(esriInstance.serviceName).toBe(config.serviceName);
      expect(esriInstance.tileSize).toBe(config.tileSize);
      expect(esriInstance.attribution).toBe(config.attribution);
    });

    it("should use default tile size when not specified", () => {
      const config = {
        serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
        serviceName: "World_Imagery",
        attribution: "ESRI World Imagery",
      };

      const esriInstance = new Esri(config);
      expect(esriInstance.tileSize).toBe(256); // Default tile size
    });

    it("should use all defaults when only provider is specified", () => {
      const config = {
        provider: "esri" as const,
      };

      const esriInstance = new Esri(config);
      expect(esriInstance.serviceUrl).toBe(
        "https://server.arcgisonline.com/ArcGIS/rest/services"
      );
      expect(esriInstance.serviceName).toBe("World_Imagery");
      expect(esriInstance.tileSize).toBe(256);
      expect(esriInstance.attribution).toBe("ESRI World Imagery");
    });
  });
});
