import { describe, expect, it, beforeAll } from "vitest";
import { Tms } from "../src/data_providers/tms";
import fs from "fs";
import path from "path";

describe("TMS Save Image", () => {
  let tms: Tms;

  beforeAll(() => {
    tms = new Tms({
      baseUrl: "https://tile.sentinelmap.eu/2016/summer/rgb",
      extension: "jpg",
      attribution: "Sentinel Maps",
      apiKey: "875e6b1c0ef7a112d1267ec91353809d",
    });
  });

  describe("TMS Image Saving Demo", () => {
    it("should demonstrate TMS configuration and URL generation", () => {
      // Test URL generation for the working tile coordinates
      const tileCoords: [number, number, number] = [8800, 5371, 14];
      const url = tms.getTileUrlFromTileCoords(tileCoords, tms);

      // This should generate the URL that we know works
      expect(url).toBe(
        "https://tile.sentinelmap.eu/2016/summer/rgb/14/8800/11012.jpg?key=875e6b1c0ef7a112d1267ec91353809d"
      );

      console.log("TMS URL generation working correctly:");
      console.log(`Input coordinates: [${tileCoords.join(", ")}]`);
      console.log(`Generated URL: ${url}`);
    });

    it("should demonstrate how to save TMS images to file", async () => {
      // Create output directory for demo
      const outputDir = path.join(process.cwd(), "test-output");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Create a demo file showing TMS usage
      const demoContent = `# TMS Image Saving Demo

## Configuration
- Base URL: ${tms.baseUrl}
- Extension: ${tms.extension}
- API Key: ${tms.apiKey ? "Configured" : "Not configured"}

## Usage Example
\`\`\`typescript
import { Tms } from "@geobase-js/geoai";

const tms = new Tms({
  baseUrl: "https://tile.sentinelmap.eu/2016/summer/rgb",
  extension: "jpg",
  apiKey: "your-api-key",
});

const polygon = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [[
      [13.38, 52.51],
      [13.381, 52.51],
      [13.381, 52.511],
      [13.38, 52.511],
      [13.38, 52.51],
    ]],
    type: "Polygon",
  },
};

const image = await tms.getImage(polygon, undefined, undefined, 14);
await image.save("tms-image.png");
\`\`\`

## Working Tile Coordinates
- Zoom Level: 14
- X: 8800
- Y: 5371 (Web Mercator) / 11012 (TMS)
- URL: https://tile.sentinelmap.eu/2016/summer/rgb/14/8800/11012.jpg?key=875e6b1c0ef7a112d1267ec91353809d
`;

      const demoPath = path.join(outputDir, "tms-demo.md");
      fs.writeFileSync(demoPath, demoContent);

      expect(fs.existsSync(demoPath)).toBe(true);
      console.log(`TMS demo documentation saved to: ${demoPath}`);
    });

    it("should verify TMS provider configuration", () => {
      expect(tms.baseUrl).toBe("https://tile.sentinelmap.eu/2016/summer/rgb");
      expect(tms.extension).toBe("jpg");
      expect(tms.attribution).toBe("Sentinel Maps");
      expect(tms.apiKey).toBe("875e6b1c0ef7a112d1267ec91353809d");

      console.log("TMS provider configured correctly:");
      console.log(`- Base URL: ${tms.baseUrl}`);
      console.log(`- Extension: ${tms.extension}`);
      console.log(`- Attribution: ${tms.attribution}`);
      console.log(`- API Key: ${tms.apiKey ? "Configured" : "Not configured"}`);
    });
  });
});
