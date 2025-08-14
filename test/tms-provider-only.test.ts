import { describe, expect, it } from "vitest";
import { Tms } from "../src/data_providers/tms";
import { tmsParams } from "./constants";

describe("TMS Provider Only", () => {
  describe("TMS Provider Functionality", () => {
    it("should create TMS provider instance", () => {
      console.log("Testing TMS provider creation...");

      const tms = new Tms({
        baseUrl: tmsParams.baseUrl,
        extension: tmsParams.extension,
        attribution: tmsParams.attribution,
        apiKey: tmsParams.apiKey,
      });

      expect(tms).toBeDefined();
      expect(tms.baseUrl).toBe(tmsParams.baseUrl);
      expect(tms.extension).toBe(tmsParams.extension);
      expect(tms.attribution).toBe(tmsParams.attribution);
      expect(tms.apiKey).toBe(tmsParams.apiKey);

      console.log("✅ TMS provider created successfully!");
      console.log("📋 Base URL:", tms.baseUrl);
      console.log("📋 Extension:", tms.extension);
      console.log("📋 Attribution:", tms.attribution);
    });

    it("should generate correct TMS URLs", () => {
      const tms = new Tms({
        baseUrl: "https://tile.sentinelmap.eu/2016/summer/rgb",
        extension: "jpg",
        apiKey: "test-key",
      });

      // Test URL generation with coordinate flipping
      const url = tms.getTileUrlFromTileCoords([8800, 5371, 14], tms);

      expect(url).toBeDefined();
      expect(url).toContain(
        "https://tile.sentinelmap.eu/2016/summer/rgb/14/8800/"
      );
      expect(url).toContain(".jpg");
      expect(url).toContain("key=test-key");

      console.log("✅ TMS URL generation works correctly!");
      console.log("📋 Generated URL:", url);
    });

    it("should handle TMS without API key", () => {
      const tms = new Tms({
        baseUrl: "https://example.com/tiles",
        extension: "png",
      });

      const url = tms.getTileUrlFromTileCoords([100, 200, 10], tms);

      expect(url).toBeDefined();
      expect(url).toBe("https://example.com/tiles/10/100/823.png");
      expect(url).not.toContain("key=");

      console.log("✅ TMS without API key works correctly!");
      console.log("📋 Generated URL:", url);
    });
  });
});
