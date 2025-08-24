import { describe, it, expect, beforeAll } from "vitest";
import { Mat, cvtColor, COLOR_RGB2GRAY } from "../src/index.js";

// Dynamic import for OpenCV.js
let cv: any = null;

beforeAll(async () => {
  try {
    // Try to load OpenCV.js for comparison
    // Note: OpenCV.js requires a browser environment, so this will likely fail in Node.js
    const opencvModule = await import("@techstark/opencv-js");
    cv = opencvModule.default;

    // Wait for OpenCV to initialize if available
    if (cv && cv.onRuntimeInitialized) {
      await new Promise<void>((resolve) => {
        cv.onRuntimeInitialized = () => resolve();
      });
    }
  } catch (error) {
    console.warn("OpenCV.js not available for comparison tests (expected in Node.js environment):", (error as Error).message);
  }
});

describe("Mini-OpenCV vs OpenCV.js Comparison", () => {
  describe("cvtColor - RGB to Grayscale", () => {
    it("should produce equivalent results for RGB to GRAY conversion", async () => {
      if (!cv) {
        console.log("Skipping OpenCV comparison - OpenCV.js not available");
        return;
      }

      // Test data: 2x2 RGB image
      const testData = new Uint8Array([
        255, 0, 0,    // Red pixel
        0, 255, 0,    // Green pixel
        0, 0, 255,    // Blue pixel
        255, 255, 255 // White pixel
      ]);

      // Mini-OpenCV result
      const miniMat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", testData, [2, 2, 3]));
      const miniGray = cvtColor(miniMat, COLOR_RGB2GRAY);
      const miniResult = Array.from(miniGray.tensor.data as Uint8Array);

      // OpenCV.js result
      const opencvMat = cv.matFromArray(2, 2, cv.CV_8UC3, testData);
      const opencvGray = new cv.Mat();
      cv.cvtColor(opencvMat, opencvGray, cv.COLOR_RGB2GRAY);
      const opencvResult = Array.from(opencvGray.data);

      // Compare results
      expect(miniResult.length).toBe(opencvResult.length);
      expect(miniResult).toEqual(opencvResult);

      // Clean up OpenCV resources
      opencvMat.delete();
      opencvGray.delete();
    });

    it("should handle edge cases correctly", async () => {
      if (!cv) {
        console.log("Skipping OpenCV comparison - OpenCV.js not available");
        return;
      }

      // Test with all zeros
      const zeroData = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      // Mini-OpenCV
      const miniMat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", zeroData, [2, 2, 3]));
      const miniGray = cvtColor(miniMat, COLOR_RGB2GRAY);
      const miniResult = Array.from(miniGray.tensor.data as Uint8Array);

      // OpenCV.js
      const opencvMat = cv.matFromArray(2, 2, cv.CV_8UC3, zeroData);
      const opencvGray = new cv.Mat();
      cv.cvtColor(opencvMat, opencvGray, cv.COLOR_RGB2GRAY);
      const opencvResult = Array.from(opencvGray.data);

      expect(miniResult).toEqual(opencvResult);

      // Clean up
      opencvMat.delete();
      opencvGray.delete();
    });

    it("should handle maximum values correctly", async () => {
      if (!cv) {
        console.log("Skipping OpenCV comparison - OpenCV.js not available");
        return;
      }

      // Test with all 255s
      const maxData = new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]);

      // Mini-OpenCV
      const miniMat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", maxData, [2, 2, 3]));
      const miniGray = cvtColor(miniMat, COLOR_RGB2GRAY);
      const miniResult = Array.from(miniGray.tensor.data as Uint8Array);

      // OpenCV.js
      const opencvMat = cv.matFromArray(2, 2, cv.CV_8UC3, maxData);
      const opencvGray = new cv.Mat();
      cv.cvtColor(opencvMat, opencvGray, cv.COLOR_RGB2GRAY);
      const opencvResult = Array.from(opencvGray.data);

      expect(miniResult).toEqual(opencvResult);

      // Clean up
      opencvMat.delete();
      opencvGray.delete();
    });
  });

  describe("Matrix Creation and Properties", () => {
    it("should create matrices with equivalent properties", async () => {
      if (!cv) {
        console.log("Skipping OpenCV comparison - OpenCV.js not available");
        return;
      }

      const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

      // Mini-OpenCV
      const miniMat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", testData, [2, 2, 3]));

      // OpenCV.js
      const opencvMat = cv.matFromArray(2, 2, cv.CV_8UC3, testData);

      // Compare properties
      expect(miniMat.rows).toBe(opencvMat.rows);
      expect(miniMat.cols).toBe(opencvMat.cols);
      expect(miniMat.channels).toBe(opencvMat.channels());
      expect(miniMat.shape).toEqual([opencvMat.rows, opencvMat.cols, opencvMat.channels()]);

      // Clean up
      opencvMat.delete();
    });
  });
});
