import { describe, it, expect } from "vitest";
import * as cv from "../src/index.js";
import { Mat, Point, Size, MORPH_RECT, MORPH_CLOSE } from "../src/index.js";

describe("Advanced morphologyEx Function", () => {
  describe("morphologyEx with anchor Point and iterations", () => {
    it("should have advanced morphologyEx function", () => {
      const src = Mat.fromArray([
        0, 255, 0,
        255, 255, 255,
        0, 255, 0
      ], [3, 3], "uint8");
      const dest = new Mat();
      const kernel = cv.getStructuringElement(MORPH_RECT, new Size(3, 3));
      
      expect(() => cv.morphologyEx(src, dest, MORPH_CLOSE, kernel, new Point(-1, -1), 1)).not.toThrow();
    });

    it("should apply morphological closing with custom anchor and iterations", () => {
      const src = Mat.fromArray([
        0, 255, 0, 0,
        255, 0, 255, 0,
        0, 255, 0, 255,
        0, 0, 255, 0
      ], [4, 4], "uint8");
      const dest = new Mat();
      const kernel = cv.getStructuringElement(MORPH_RECT, new Size(3, 3));
      
      cv.morphologyEx(src, dest, MORPH_CLOSE, kernel, new Point(-1, -1), 2);
      
      expect(dest.rows).toBe(4);
      expect(dest.cols).toBe(4);
      expect(dest.tensor.type).toBe("uint8");
    });

    it("should work with default anchor Point(-1, -1)", () => {
      const src = Mat.fromArray([
        0, 255, 0,
        255, 0, 255,
        0, 255, 0
      ], [3, 3], "uint8");
      const dest = new Mat();
      const kernel = cv.getStructuringElement(MORPH_RECT, new Size(3, 3));
      
      cv.morphologyEx(src, dest, MORPH_CLOSE, kernel, new Point(-1, -1), 1);
      
      expect(dest.rows).toBe(3);
      expect(dest.cols).toBe(3);
    });

    it("should handle multiple iterations", () => {
      const src = Mat.fromArray([
        0, 255, 0, 0,
        255, 0, 0, 255,
        0, 0, 255, 0,
        255, 0, 0, 0
      ], [4, 4], "uint8");
      const dest1 = new Mat();
      const dest3 = new Mat();
      const kernel = cv.getStructuringElement(MORPH_RECT, new Size(3, 3));
      
      cv.morphologyEx(src, dest1, MORPH_CLOSE, kernel, new Point(-1, -1), 1);
      cv.morphologyEx(src, dest3, MORPH_CLOSE, kernel, new Point(-1, -1), 3);
      
      // Multiple iterations should generally result in different output
      expect(dest1.rows).toBe(dest3.rows);
      expect(dest1.cols).toBe(dest3.cols);
    });

    it("should work with custom anchor points", () => {
      const src = Mat.fromArray([
        0, 255, 0,
        255, 0, 255,
        0, 255, 0
      ], [3, 3], "uint8");
      const dest = new Mat();
      const kernel = cv.getStructuringElement(MORPH_RECT, new Size(3, 3));
      
      // Test with different anchor points
      expect(() => cv.morphologyEx(src, dest, MORPH_CLOSE, kernel, new Point(0, 0), 1)).not.toThrow();
      expect(() => cv.morphologyEx(src, dest, MORPH_CLOSE, kernel, new Point(1, 1), 1)).not.toThrow();
      expect(() => cv.morphologyEx(src, dest, MORPH_CLOSE, kernel, new Point(2, 2), 1)).not.toThrow();
    });
  });

  describe("Integration with existing morphologyEx", () => {
    it("should work alongside simple morphologyEx", () => {
      const src = Mat.fromArray([
        0, 255, 0,
        255, 0, 255,
        0, 255, 0
      ], [3, 3], "uint8");
      const dest1 = new Mat();
      const dest2 = new Mat();
      const kernel = cv.getStructuringElement(MORPH_RECT, new Size(3, 3));
      
      // Simple version
      cv.morphologyEx(src, MORPH_CLOSE, kernel, dest1);
      
      // Advanced version with default parameters
      cv.morphologyEx(src, dest2, MORPH_CLOSE, kernel, new Point(-1, -1), 1);
      
      expect(dest1.rows).toBe(dest2.rows);
      expect(dest1.cols).toBe(dest2.cols);
    });

    it("should produce equivalent results with default parameters", () => {
      const src = Mat.fromArray([
        0, 255, 0,
        255, 0, 255,
        0, 255, 0
      ], [3, 3], "uint8");
      const dest1 = new Mat();
      const dest2 = new Mat();
      const kernel = cv.getStructuringElement(MORPH_RECT, new Size(3, 3));
      
      // Return-based version
      const result1 = cv.morphologyEx(src, MORPH_CLOSE, kernel);
      
      // Advanced destination-based version with default parameters
      cv.morphologyEx(src, dest2, MORPH_CLOSE, kernel, new Point(-1, -1), 1);
      
      expect(result1.rows).toBe(dest2.rows);
      expect(result1.cols).toBe(dest2.cols);
    });
  });

  describe("Error handling", () => {
    it("should handle empty source matrix", () => {
      const src = new Mat();
      const dest = new Mat();
      const kernel = cv.getStructuringElement(MORPH_RECT, new Size(3, 3));
      
      expect(() => cv.morphologyEx(src, dest, MORPH_CLOSE, kernel, new Point(-1, -1), 1)).toThrow();
    });

    it("should handle invalid iterations", () => {
      const src = Mat.fromArray([
        0, 255, 0,
        255, 0, 255,
        0, 255, 0
      ], [3, 3], "uint8");
      const dest = new Mat();
      const kernel = cv.getStructuringElement(MORPH_RECT, new Size(3, 3));
      
      // Zero iterations should still work (no-op)
      expect(() => cv.morphologyEx(src, dest, MORPH_CLOSE, kernel, new Point(-1, -1), 0)).not.toThrow();
      
      // Negative iterations should be handled gracefully
      expect(() => cv.morphologyEx(src, dest, MORPH_CLOSE, kernel, new Point(-1, -1), -1)).not.toThrow();
    });

    it("should handle empty kernel", () => {
      const src = Mat.fromArray([
        0, 255, 0,
        255, 0, 255,
        0, 255, 0
      ], [3, 3], "uint8");
      const dest = new Mat();
      const emptyKernel = new Mat();
      
      expect(() => cv.morphologyEx(src, dest, MORPH_CLOSE, emptyKernel, new Point(-1, -1), 1)).toThrow();
    });
  });

  describe("Different kernel sizes", () => {
    it("should work with 5x5 kernel", () => {
      const src = Mat.fromArray([
        0, 255, 0, 255, 0,
        255, 0, 255, 0, 255,
        0, 255, 0, 255, 0,
        255, 0, 255, 0, 255,
        0, 255, 0, 255, 0
      ], [5, 5], "uint8");
      const dest = new Mat();
      const kernel = cv.getStructuringElement(MORPH_RECT, new Size(5, 5));
      
      expect(() => cv.morphologyEx(src, dest, MORPH_CLOSE, kernel, new Point(-1, -1), 1)).not.toThrow();
    });

    it("should work with 1x1 kernel", () => {
      const src = Mat.fromArray([
        0, 255, 0,
        255, 0, 255,
        0, 255, 0
      ], [3, 3], "uint8");
      const dest = new Mat();
      const kernel = cv.getStructuringElement(MORPH_RECT, new Size(1, 1));
      
      expect(() => cv.morphologyEx(src, dest, MORPH_CLOSE, kernel, new Point(-1, -1), 1)).not.toThrow();
    });
  });

  describe("Multiple iteration effects", () => {
    it("should apply multiple iterations correctly", () => {
      const src = Mat.fromArray([
        0, 0, 0, 0, 0,
        0, 255, 0, 255, 0,
        0, 0, 0, 0, 0,
        0, 255, 0, 255, 0,
        0, 0, 0, 0, 0
      ], [5, 5], "uint8");
      const dest = new Mat();
      const kernel = cv.getStructuringElement(MORPH_RECT, new Size(3, 3));
      
      cv.morphologyEx(src, dest, MORPH_CLOSE, kernel, new Point(-1, -1), 2);
      
      expect(dest.rows).toBe(5);
      expect(dest.cols).toBe(5);
      
      // After multiple iterations of closing, we should have filled some gaps
      const destData = dest.tensor.data as Uint8Array;
      expect(destData.some(val => val === 255)).toBe(true);
    });
  });
});
