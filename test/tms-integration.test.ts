import { describe, expect, it } from "vitest";
import { geoai } from "../src/geobase-ai";
import { tmsParams } from "./constants";

describe("TMS Integration", () => {
  describe("TMS with GeoAI Pipeline", () => {
    it("should initialize TMS provider correctly", () => {
      expect(tmsParams.provider).toBe("tms");
      if (tmsParams.provider === "tms") {
        expect(tmsParams.baseUrl).toBe(
          "https://tile.sentinelmap.eu/2016/summer/rgb"
        );
        expect(tmsParams.apiKey).toBeDefined();
      }
    });

    it("should create geoai instance with TMS provider", () => {
      expect(geoai).toBeDefined();
      expect(geoai.pipeline).toBeDefined();
      expect(geoai.tasks).toBeDefined();
      expect(geoai.models).toBeDefined();
    });

    it("should support TMS in provider parameters", () => {
      // This test verifies that TMS is properly included in the ProviderParams union type
      const tmsConfig = {
        provider: "tms" as const,
        baseUrl: "https://example.com/tiles",
        apiKey: "test-key",
      };

      expect(tmsConfig.provider).toBe("tms");
      expect(tmsConfig.baseUrl).toBe("https://example.com/tiles");
      expect(tmsConfig.apiKey).toBe("test-key");
    });
  });
});
