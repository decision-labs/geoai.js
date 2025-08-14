import { describe, expect, it } from "vitest";
import { Tms } from "../src/data_providers/tms";
import { tmsParams } from "./constants";
import { load_image } from "@huggingface/transformers";
import fs from "fs";
import path from "path";

describe("TMS Image Fetch", () => {
  describe("Fetch and Save TMS Images", () => {
    it("should fetch and save a TMS tile", async () => {
      console.log("Testing TMS image fetch and save...");

      const tms = new Tms({
        baseUrl: tmsParams.baseUrl,
        extension: tmsParams.extension,
        attribution: tmsParams.attribution,
        apiKey: tmsParams.apiKey,
      });

      // Generate URL for a known working tile
      const tileUrl = tms.getTileUrlFromTileCoords([8800, 5371, 14], tms);
      console.log("📋 Fetching tile from:", tileUrl);

      try {
        // Fetch the image
        const image = await load_image(tileUrl);

        expect(image).toBeDefined();
        expect(image.width).toBeGreaterThan(0);
        expect(image.height).toBeGreaterThan(0);

        console.log(
          `✅ Image fetched successfully: ${image.width}x${image.height}`
        );

        // Save the image
        const outputDir = path.join(process.cwd(), "test-output");
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const jpgPath = path.join(outputDir, "tms-fetched-tile.jpg");
        await image.save(jpgPath);

        expect(fs.existsSync(jpgPath)).toBe(true);

        const stats = fs.statSync(jpgPath);
        expect(stats.size).toBeGreaterThan(1024);

        console.log(`✅ TMS tile saved to: ${jpgPath}`);
        console.log(`📁 File size: ${stats.size} bytes`);

        // Also save as PNG
        const pngPath = path.join(outputDir, "tms-fetched-tile.png");
        await image.save(pngPath);
        console.log(`✅ TMS tile also saved as PNG: ${pngPath}`);
      } catch (error) {
        console.error("❌ Error fetching TMS tile:", error);
        throw error;
      }
    }, 30000);

    it("should fetch multiple tiles and verify URLs", async () => {
      console.log("Testing TMS URL generation for multiple tiles...");

      const tms = new Tms({
        baseUrl: "https://tile.sentinelmap.eu/2016/summer/rgb",
        extension: "jpg",
        apiKey: "875e6b1c0ef7a112d1267ec91353809d",
      });

      // Test different zoom levels and coordinates
      const testCases = [
        { coords: [8800, 5371, 14], expected: "14/8800/11012.jpg" }, // 5371 flipped to 11012
        { coords: [4400, 2685, 13], expected: "13/4400/5498.jpg" }, // 2685 flipped to 5498
        { coords: [2200, 1342, 12], expected: "12/2200/2749.jpg" }, // 1342 flipped to 2749
      ];

      for (const testCase of testCases) {
        const url = tms.getTileUrlFromTileCoords(testCase.coords, tms);
        expect(url).toContain(testCase.expected);
        expect(url).toContain("key=875e6b1c0ef7a112d1267ec91353809d");
        console.log(`✅ URL for ${testCase.coords.join(",")}: ${url}`);
      }

      console.log("✅ All TMS URL generations work correctly!");
    });
  });
});
