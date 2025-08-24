import { describe, it, expect } from "vitest";
import * as cv from "../src/index.js";
import { Mat, CV_8U, THRESH_BINARY } from "../src/index.js";

describe("Overloaded threshold Function", () => {
  describe("threshold with destination matrix", () => {
    it("should have overloaded threshold function", () => {
      const src = Mat.fromArray([100, 200, 50, 180], [2, 2], "uint8");
      const dest = new Mat();
      
      expect(() => cv.threshold(src, dest, 128, 255, THRESH_BINARY)).not.toThrow();
    });

    it("should threshold uint8 image to destination", () => {
      const src = Mat.fromArray([100, 200, 50, 180], [2, 2], "uint8");
      const dest = new Mat();
      
      cv.threshold(src, dest, 128, 255, THRESH_BINARY);
      
      expect(dest.rows).toBe(2);
      expect(dest.cols).toBe(2);
      expect(dest.tensor.type).toBe("uint8");
    });

    it("should work with different threshold values", () => {
      const src = Mat.fromArray([100, 200, 50, 180], [2, 2], "uint8");
      const dest = new Mat();
      
      expect(() => cv.threshold(src, dest, 100, 255, THRESH_BINARY)).not.toThrow();
      expect(() => cv.threshold(src, dest, 150, 255, THRESH_BINARY)).not.toThrow();
      expect(() => cv.threshold(src, dest, 50, 200, THRESH_BINARY)).not.toThrow();
    });

    it("should work with float32 source", () => {
      const src = Mat.fromArray([0.4, 0.8, 0.2, 0.7], [2, 2], "float32");
      const dest = new Mat();
      
      expect(() => cv.threshold(src, dest, 0.5, 1.0, THRESH_BINARY)).not.toThrow();
    });

    it("should work with larger matrices", () => {
      const src = Mat.fromArray([
        100, 200, 50, 180, 120, 90,
        160, 75, 220, 140, 30, 250
      ], [2, 6], "uint8");
      const dest = new Mat();
      
      expect(() => cv.threshold(src, dest, 128, 255, THRESH_BINARY)).not.toThrow();
    });
  });

  describe("Integration with existing return-based function", () => {
    it("should work alongside return-based threshold", () => {
      const src = Mat.fromArray([100, 200, 50, 180], [2, 2], "uint8");
      
      // Return-based version
      const result1 = cv.threshold(src, 128, 255, THRESH_BINARY);
      
      // Destination-based version
      const dest = new Mat();
      cv.threshold(src, dest, 128, 255, THRESH_BINARY);
      
      expect(result1.rows).toBe(dest.rows);
      expect(result1.cols).toBe(dest.cols);
      expect(result1.tensor.type).toBe(dest.tensor.type);
    });

    it("should produce equivalent results", () => {
      const src = Mat.fromArray([100, 200, 50, 180], [2, 2], "uint8");
      
      // Return-based version
      const result1 = cv.threshold(src, 128, 255, THRESH_BINARY);
      
      // Destination-based version
      const dest = new Mat();
      cv.threshold(src, dest, 128, 255, THRESH_BINARY);
      
      // Check that values match
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 2; x++) {
          expect(result1.get(y, x)).toBe(dest.get(y, x));
        }
      }
    });
  });

  describe("Threshold behavior", () => {
    it("should apply threshold correctly", () => {
      const src = Mat.fromArray([100, 200, 50, 180], [2, 2], "uint8");
      const dest = new Mat();
      
      cv.threshold(src, dest, 128, 255, THRESH_BINARY);
      
      // Values: 100 <= 128, 200 > 128, 50 <= 128, 180 > 128
      expect(dest.get(0, 0)).toBe(0);   // 100 <= 128 -> 0
      expect(dest.get(0, 1)).toBe(255); // 200 > 128 -> 255
      expect(dest.get(1, 0)).toBe(0);   // 50 <= 128 -> 0
      expect(dest.get(1, 1)).toBe(255); // 180 > 128 -> 255
    });

    it("should handle edge values", () => {
      const src = Mat.fromArray([128, 129, 127, 128], [2, 2], "uint8");
      const dest = new Mat();
      
      cv.threshold(src, dest, 128, 255, THRESH_BINARY);
      
      expect(dest.get(0, 0)).toBe(0);   // 128 <= 128 -> 0
      expect(dest.get(0, 1)).toBe(255); // 129 > 128 -> 255
      expect(dest.get(1, 0)).toBe(0);   // 127 <= 128 -> 0
      expect(dest.get(1, 1)).toBe(0);   // 128 <= 128 -> 0
    });

    it("should handle float32 thresholding", () => {
      const src = Mat.fromArray([0.4, 0.8, 0.2, 0.7], [2, 2], "float32");
      const dest = new Mat();
      
      cv.threshold(src, dest, 0.5, 1.0, THRESH_BINARY);
      
      expect(dest.get(0, 0)).toBe(0); // 0.4 <= 0.5 -> 0
      expect(dest.get(0, 1)).toBe(1); // 0.8 > 0.5 -> 1
      expect(dest.get(1, 0)).toBe(0); // 0.2 <= 0.5 -> 0
      expect(dest.get(1, 1)).toBe(1); // 0.7 > 0.5 -> 1
    });
  });

  describe("Error handling", () => {
    it("should handle empty source matrix", () => {
      const src = new Mat();
      const dest = new Mat();
      
      expect(() => cv.threshold(src, dest, 128, 255, THRESH_BINARY)).toThrow();
    });

    it("should handle empty destination matrix", () => {
      const src = Mat.fromArray([100, 200, 50, 180], [2, 2], "uint8");
      const dest = new Mat();
      
      expect(() => cv.threshold(src, dest, 128, 255, THRESH_BINARY)).not.toThrow();
    });

    it("should handle unsupported threshold type", () => {
      const src = Mat.fromArray([100, 200, 50, 180], [2, 2], "uint8");
      const dest = new Mat();
      
      expect(() => cv.threshold(src, dest, 128, 255, 999)).toThrow();
    });
  });

  describe("Different data types", () => {
    it("should work with uint8 source", () => {
      const src = Mat.fromArray([100, 200, 50, 180], [2, 2], "uint8");
      const dest = new Mat();
      
      expect(() => cv.threshold(src, dest, 128, 255, THRESH_BINARY)).not.toThrow();
    });

    it("should work with float32 source", () => {
      const src = Mat.fromArray([0.4, 0.8, 0.2, 0.7], [2, 2], "float32");
      const dest = new Mat();
      
      expect(() => cv.threshold(src, dest, 0.5, 1.0, THRESH_BINARY)).not.toThrow();
    });

    it("should handle 3-channel images", () => {
      const src = Mat.fromArray([
        100, 150, 200,
        50, 75, 125,
        180, 220, 90,
        160, 40, 240
      ], [2, 2, 3], "uint8");
      const dest = new Mat();
      
      expect(() => cv.threshold(src, dest, 128, 255, THRESH_BINARY)).not.toThrow();
    });
  });
});
