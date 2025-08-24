import { describe, it, expect } from "vitest";
import * as cv from "../src/index.js";
import { Mat, Size, INTER_NEAREST, INTER_LINEAR } from "../src/index.js";

describe("Advanced resize Function", () => {
  describe("resize with scale factors and interpolation", () => {
    it("should have advanced resize function", () => {
      const src = Mat.fromArray([
        100, 150, 200,
        120, 180, 220,
        140, 160, 240
      ], [3, 3], "uint8");
      const dest = new Mat();
      
      expect(() => cv.resize(src, dest, new Size(6, 6), 0, 0, INTER_NEAREST)).not.toThrow();
    });

    it("should resize with destination matrix and interpolation", () => {
      const src = Mat.fromArray([
        100, 200,
        150, 250
      ], [2, 2], "uint8");
      const dest = new Mat();
      
      cv.resize(src, dest, new Size(4, 4), 0, 0, INTER_NEAREST);
      
      expect(dest.rows).toBe(4);
      expect(dest.cols).toBe(4);
      expect(dest.tensor.type).toBe("uint8");
    });

    it("should work with scale factors instead of size", () => {
      const src = Mat.fromArray([
        100, 200,
        150, 250
      ], [2, 2], "uint8");
      const dest = new Mat();
      
      // When Size is (0,0), use scale factors fx=2.0, fy=2.0
      cv.resize(src, dest, new Size(0, 0), 2.0, 2.0, INTER_NEAREST);
      
      expect(dest.rows).toBe(4); // 2 * 2.0
      expect(dest.cols).toBe(4); // 2 * 2.0
    });

    it("should work with different interpolation methods", () => {
      const src = Mat.fromArray([
        100, 200,
        150, 250
      ], [2, 2], "uint8");
      const dest1 = new Mat();
      const dest2 = new Mat();
      
      cv.resize(src, dest1, new Size(4, 4), 0, 0, INTER_NEAREST);
      cv.resize(src, dest2, new Size(4, 4), 0, 0, INTER_LINEAR);
      
      expect(dest1.rows).toBe(dest2.rows);
      expect(dest1.cols).toBe(dest2.cols);
      // Results may be different due to interpolation
    });

    it("should work with explicit Size dimensions", () => {
      const src = Mat.fromArray([
        100, 150, 200,
        120, 180, 220
      ], [2, 3], "uint8");
      const dest = new Mat();
      
      cv.resize(src, dest, new Size(6, 4), 0, 0, INTER_LINEAR);
      
      expect(dest.rows).toBe(4);
      expect(dest.cols).toBe(6);
    });

    it("should handle downscaling", () => {
      const src = Mat.fromArray([
        100, 150, 200, 250,
        120, 180, 220, 270,
        140, 160, 240, 280,
        160, 170, 260, 290
      ], [4, 4], "uint8");
      const dest = new Mat();
      
      cv.resize(src, dest, new Size(2, 2), 0, 0, INTER_NEAREST);
      
      expect(dest.rows).toBe(2);
      expect(dest.cols).toBe(2);
    });

    it("should work with 3-channel images", () => {
      const src = Mat.fromArray([
        255, 0, 0, 0, 255, 0,
        0, 0, 255, 255, 255, 255
      ], [2, 2, 3], "uint8");
      const dest = new Mat();
      
      cv.resize(src, dest, new Size(4, 4), 0, 0, INTER_NEAREST);
      
      expect(dest.rows).toBe(4);
      expect(dest.cols).toBe(4);
      expect(dest.channels).toBe(3);
    });

    it("should ignore scale factors when explicit size is given", () => {
      const src = Mat.fromArray([
        100, 200,
        150, 250
      ], [2, 2], "uint8");
      const dest = new Mat();
      
      // Size is explicit, so fx and fy should be ignored
      cv.resize(src, dest, new Size(3, 3), 10.0, 10.0, INTER_NEAREST);
      
      expect(dest.rows).toBe(3);
      expect(dest.cols).toBe(3);
    });
  });

  describe("Integration with existing resize", () => {
    it("should work alongside simple resize", () => {
      const src = Mat.fromArray([
        100, 200,
        150, 250
      ], [2, 2], "uint8");
      const dest1 = new Mat();
      
      // Simple version
      const result1 = cv.resize(src, new Size(4, 4), INTER_NEAREST);
      
      // Advanced version
      cv.resize(src, dest1, new Size(4, 4), 0, 0, INTER_NEAREST);
      
      expect(result1.rows).toBe(dest1.rows);
      expect(result1.cols).toBe(dest1.cols);
    });

    it("should produce equivalent results with same parameters", () => {
      const src = Mat.fromArray([
        100, 200,
        150, 250
      ], [2, 2], "uint8");
      const dest = new Mat();
      
      // Return-based version
      const result = cv.resize(src, new Size(4, 4), INTER_LINEAR);
      
      // Advanced destination-based version  
      cv.resize(src, dest, new Size(4, 4), 0, 0, INTER_LINEAR);
      
      expect(result.rows).toBe(dest.rows);
      expect(result.cols).toBe(dest.cols);
      
      // Data should be approximately the same
      const resultData = result.tensor.data as Uint8Array;
      const destData = dest.tensor.data as Uint8Array;
      expect(resultData.length).toBe(destData.length);
    });
  });

  describe("Error handling", () => {
    it("should handle empty source matrix", () => {
      const src = new Mat();
      const dest = new Mat();
      
      expect(() => cv.resize(src, dest, new Size(4, 4), 0, 0, INTER_NEAREST)).toThrow();
    });

    it("should handle invalid size", () => {
      const src = Mat.fromArray([
        100, 200,
        150, 250
      ], [2, 2], "uint8");
      const dest = new Mat();
      
      expect(() => cv.resize(src, dest, new Size(-1, 4), 0, 0, INTER_NEAREST)).toThrow();
      expect(() => cv.resize(src, dest, new Size(4, -1), 0, 0, INTER_NEAREST)).toThrow();
    });

    it("should handle invalid scale factors", () => {
      const src = Mat.fromArray([
        100, 200,
        150, 250
      ], [2, 2], "uint8");
      const dest = new Mat();
      
      // Negative scale factors should be handled gracefully
      expect(() => cv.resize(src, dest, new Size(0, 0), -1.0, 2.0, INTER_NEAREST)).toThrow();
      expect(() => cv.resize(src, dest, new Size(0, 0), 2.0, -1.0, INTER_NEAREST)).toThrow();
    });

    it("should handle zero scale factors", () => {
      const src = Mat.fromArray([
        100, 200,
        150, 250
      ], [2, 2], "uint8");
      const dest = new Mat();
      
      // Zero scale factors with Size(0,0) should be invalid
      expect(() => cv.resize(src, dest, new Size(0, 0), 0, 0, INTER_NEAREST)).toThrow();
    });
  });

  describe("Scale factor calculations", () => {
    it("should calculate correct size from scale factors", () => {
      const src = Mat.fromArray([
        100, 200, 150,
        150, 250, 175
      ], [2, 3], "uint8");
      const dest = new Mat();
      
      // Scale by 1.5x in both directions
      cv.resize(src, dest, new Size(0, 0), 1.5, 1.5, INTER_NEAREST);
      
      expect(dest.rows).toBe(3); // 2 * 1.5 = 3
      expect(dest.cols).toBe(5); // 3 * 1.5 = 4.5 -> rounded to 5
    });

    it("should handle different scale factors for width and height", () => {
      const src = Mat.fromArray([
        100, 200,
        150, 250
      ], [2, 2], "uint8");
      const dest = new Mat();
      
      // Scale width by 3x, height by 2x
      cv.resize(src, dest, new Size(0, 0), 3.0, 2.0, INTER_NEAREST);
      
      expect(dest.rows).toBe(4); // 2 * 2.0
      expect(dest.cols).toBe(6); // 2 * 3.0
    });

    it("should handle fractional scale factors", () => {
      const src = Mat.fromArray([
        100, 200, 150, 175,
        150, 250, 175, 225,
        125, 225, 200, 250,
        175, 275, 225, 275
      ], [4, 4], "uint8");
      const dest = new Mat();
      
      // Scale down by 0.5x
      cv.resize(src, dest, new Size(0, 0), 0.5, 0.5, INTER_NEAREST);
      
      expect(dest.rows).toBe(2); // 4 * 0.5
      expect(dest.cols).toBe(2); // 4 * 0.5
    });
  });
});
