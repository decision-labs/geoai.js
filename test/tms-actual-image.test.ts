import { describe, expect, it } from "vitest";
import { load_image } from "@huggingface/transformers";
import fs from "fs";
import path from "path";

describe("TMS Actual Image Fetch", () => {
  describe("Fetch and Save Single Tile", () => {
    it("should fetch a single TMS tile and save it", async () => {
      // Use the exact URL we know works
      const tileUrl =
        "https://tile.sentinelmap.eu/2016/summer/rgb/14/8800/5371.jpg?key=875e6b1c0ef7a112d1267ec91353809d";

      console.log(`Fetching tile from: ${tileUrl}`);

      // Fetch the image
      const image = await load_image(tileUrl);

      expect(image).toBeDefined();
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);

      console.log(`Image fetched successfully: ${image.width}x${image.height}`);

      // Create output directory
      const outputDir = path.join(process.cwd(), "test-output");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Save the image
      const outputPath = path.join(outputDir, "tms-single-tile.jpg");
      await image.save(outputPath);

      // Verify the file was created
      expect(fs.existsSync(outputPath)).toBe(true);

      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(1024);

      console.log(`✅ TMS tile saved to: ${outputPath}`);
      console.log(`📁 File size: ${stats.size} bytes`);
      console.log(`🖼️  Image dimensions: ${image.width}x${image.height}`);

      // Also save as PNG for comparison
      const pngPath = path.join(outputDir, "tms-single-tile.png");
      await image.save(pngPath);
      console.log(`✅ TMS tile also saved as PNG: ${pngPath}`);
    }, 30000);
  });
});
