import { describe, expect, it, beforeAll } from "vitest";
import { Tms } from "../src/data_providers/tms";
import { GeoRawImage } from "../src/types/images/GeoRawImage";
import fs from "fs";
import path from "path";

describe("TMS GetImage and Save", () => {
  let tms: Tms;

  beforeAll(() => {
    tms = new Tms({
      baseUrl: "https://tile.sentinelmap.eu/2016/summer/rgb",
      extension: "jpg",
      attribution: "Sentinel Maps",
      apiKey: "875e6b1c0ef7a112d1267ec91353809d",
    });
  });

  describe("Full GetImage + Save Pipeline", () => {
    it("should fetch stitched image from polygon and save it", async () => {
      // Create a very small polygon that should generate just a few tiles
      const smallPolygon = {
        type: "Feature",
        properties: {},
        geometry: {
          coordinates: [
            [
              [13.38, 52.51],
              [13.381, 52.51],
              [13.381, 52.511],
              [13.38, 52.511],
              [13.38, 52.51],
            ],
          ],
          type: "Polygon",
        },
      } as GeoJSON.Feature;

      console.log("Fetching stitched image from polygon...");

      // Use getImage to fetch and stitch tiles
      const image = await tms.getImage(smallPolygon, undefined, undefined, 14);

      expect(image).toBeInstanceOf(GeoRawImage);
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);

      console.log(`Stitched image created: ${image.width}x${image.height}`);

      // Create output directory
      const outputDir = path.join(process.cwd(), "test-output");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Save the stitched image
      const outputPath = path.join(outputDir, "tms-stitched-image.png");
      await image.save(outputPath);

      // Verify the file was created
      expect(fs.existsSync(outputPath)).toBe(true);

      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(1024);

      console.log(`✅ Stitched TMS image saved to: ${outputPath}`);
      console.log(`📁 File size: ${stats.size} bytes`);
      console.log(`🖼️  Image dimensions: ${image.width}x${image.height}`);

      // Check bounds
      const bounds = image.getBounds();
      console.log(
        `📍 Bounds: ${bounds.west}, ${bounds.south}, ${bounds.east}, ${bounds.north}`
      );
    }, 30000);
  });
});
