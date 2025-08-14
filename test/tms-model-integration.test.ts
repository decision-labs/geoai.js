import { describe, expect, it } from "vitest";
import { geoai } from "../src/geobase-ai";
import { tmsParams } from "./constants";
import fs from "fs";
import path from "path";

describe("TMS Model Integration", () => {
  describe("Run AI Model on TMS Imagery", () => {
    it("should run object detection on TMS imagery", async () => {
      // Create a tiny polygon for testing
      const tinyPolygon = {
        type: "Feature",
        properties: {},
        geometry: {
          coordinates: [
            [
              [13.38, 52.51],
              [13.3805, 52.51],
              [13.3805, 52.5105],
              [13.38, 52.5105],
              [13.38, 52.51],
            ],
          ],
          type: "Polygon",
        },
      } as GeoJSON.Feature;

      console.log("Running object detection on TMS imagery...");
      console.log("TMS Provider:", tmsParams.provider);

      try {
        // Create the pipeline with object detection
        const pipeline = await geoai.pipeline(
          [{ task: "object-detection" }],
          tmsParams
        );

        // Run inference
        const results = await pipeline.inference({
          inputs: {
            polygon: tinyPolygon,
          },
          mapSourceParams: {
            zoomLevel: 16, // Higher zoom for tiny area
          },
          postProcessingParams: {
            confidence: 0.5,
          },
        });

        expect(results).toBeDefined();
        expect(results.detections).toBeDefined();
        expect(Array.isArray(results.detections)).toBe(true);

        console.log(`✅ Object detection completed successfully!`);
        console.log(`📊 Found ${results.detections.length} objects`);

        // Save the processed image
        if (results.geoRawImage) {
          const outputDir = path.join(process.cwd(), "test-output");
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const imagePath = path.join(outputDir, "tms-object-detection.png");
          await results.geoRawImage.save(imagePath);

          console.log(`🖼️  Processed image saved to: ${imagePath}`);
          console.log(
            `📏 Image dimensions: ${results.geoRawImage.width}x${results.geoRawImage.height}`
          );
        }

        // Save detection results as GeoJSON
        if (results.detections && results.detections.length > 0) {
          const outputDir = path.join(process.cwd(), "test-output");
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const geojsonPath = path.join(outputDir, "tms-detections.geojson");
          fs.writeFileSync(
            geojsonPath,
            JSON.stringify(results.detections, null, 2)
          );

          console.log(`📍 Detection results saved to: ${geojsonPath}`);
          console.log(`🎯 Sample detection:`, results.detections[0]);
        }
      } catch (error) {
        console.error("❌ Error running model on TMS:", error);
        throw error;
      }
    }, 60000); // 60 second timeout for model inference

    it("should run building detection on TMS imagery", async () => {
      // Create a smaller polygon for faster processing
      const smallPolygon = {
        type: "Feature",
        properties: {},
        geometry: {
          coordinates: [
            [
              [13.38, 52.51],
              [13.385, 52.51],
              [13.385, 52.515],
              [13.38, 52.515],
              [13.38, 52.51],
            ],
          ],
          type: "Polygon",
        },
      } as GeoJSON.Feature;

      console.log("Running building detection on TMS imagery...");

      try {
        // Create the pipeline with building detection
        const pipeline = await geoai.pipeline(
          [{ task: "building-detection" }],
          tmsParams
        );

        // Run inference
        const results = await pipeline.inference({
          inputs: {
            polygon: smallPolygon,
          },
          mapSourceParams: {
            zoomLevel: 15, // Higher zoom for building detection
          },
          postProcessingParams: {
            confidence: 0.3,
          },
        });

        expect(results).toBeDefined();
        expect(results.detections).toBeDefined();

        console.log(`✅ Building detection completed successfully!`);
        console.log(`🏢 Found ${results.detections.length} buildings`);

        // Save the processed image
        if (results.geoRawImage) {
          const outputDir = path.join(process.cwd(), "test-output");
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const imagePath = path.join(outputDir, "tms-building-detection.png");
          await results.geoRawImage.save(imagePath);

          console.log(`🖼️  Building detection image saved to: ${imagePath}`);
        }
      } catch (error) {
        console.error("❌ Error running building detection on TMS:", error);
        throw error;
      }
    }, 60000);
  });
});
