import { describe, it, expect } from "vitest";
import * as cv from "../src/index.js";
import { Mat, COLOR_RGB2GRAY, COLOR_BGR2RGB } from "../src/index.js";

describe("Overloaded cvtColor Function", () => {
  describe("cvtColor with destination matrix", () => {
    it("should have overloaded cvtColor function", () => {
      const src = Mat.fromArray([
        255, 0, 0, 0, 255, 0,
        0, 0, 255, 128, 128, 128
      ], [2, 2, 3], "uint8");
      const dest = new Mat();
      
      expect(() => cv.cvtColor(src, dest, COLOR_RGB2GRAY)).not.toThrow();
    });

    it("should convert RGB to grayscale to destination", () => {
      const src = Mat.fromArray([
        255, 0, 0, 0, 255, 0,
        0, 0, 255, 128, 128, 128
      ], [2, 2, 3], "uint8");
      const dest = new Mat();
      
      cv.cvtColor(src, dest, COLOR_RGB2GRAY);
      
      expect(dest.rows).toBe(2);
      expect(dest.cols).toBe(2);
      expect(dest.channels).toBe(1);
      expect(dest.tensor.type).toBe("uint8");
    });

    it("should convert BGR to RGB to destination", () => {
      const src = Mat.fromArray([
        255, 0, 0, 0, 255, 0,
        0, 0, 255, 128, 128, 128
      ], [2, 2, 3], "uint8");
      const dest = new Mat();
      
      cv.cvtColor(src, dest, COLOR_BGR2RGB);
      
      expect(dest.rows).toBe(2);
      expect(dest.cols).toBe(2);
      expect(dest.channels).toBe(3);
      expect(dest.tensor.type).toBe("uint8");
    });

    it("should work with larger images", () => {
      const src = Mat.fromArray([
        255, 0, 0, 0, 255, 0, 0, 0, 255,
        128, 128, 128, 64, 64, 64, 192, 192, 192
      ], [2, 3, 3], "uint8");
      const dest = new Mat();
      
      expect(() => cv.cvtColor(src, dest, COLOR_RGB2GRAY)).not.toThrow();
    });
  });

  describe("Integration with existing return-based function", () => {
    it("should work alongside return-based cvtColor", () => {
      const src = Mat.fromArray([
        255, 0, 0, 0, 255, 0,
        0, 0, 255, 128, 128, 128
      ], [2, 2, 3], "uint8");
      
      // Return-based version
      const result1 = cv.cvtColor(src, COLOR_RGB2GRAY);
      
      // Destination-based version
      const dest = new Mat();
      cv.cvtColor(src, dest, COLOR_RGB2GRAY);
      
      expect(result1.rows).toBe(dest.rows);
      expect(result1.cols).toBe(dest.cols);
      expect(result1.channels).toBe(dest.channels);
      expect(result1.tensor.type).toBe(dest.tensor.type);
    });

    it("should produce equivalent results", () => {
      const src = Mat.fromArray([
        255, 0, 0, 0, 255, 0,
        0, 0, 255, 128, 128, 128
      ], [2, 2, 3], "uint8");
      
      // Return-based version
      const result1 = cv.cvtColor(src, COLOR_RGB2GRAY);
      
      // Destination-based version
      const dest = new Mat();
      cv.cvtColor(src, dest, COLOR_RGB2GRAY);
      
      // Check that values match
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 2; x++) {
          expect(result1.get(y, x)).toBe(dest.get(y, x));
        }
      }
    });
  });

  describe("Color conversion behavior", () => {
    it("should convert RGB to grayscale correctly", () => {
      // Pure red, green, blue, and gray
      const src = Mat.fromArray([
        255, 0, 0, 0, 255, 0,
        0, 0, 255, 128, 128, 128
      ], [2, 2, 3], "uint8");
      const dest = new Mat();
      
      cv.cvtColor(src, dest, COLOR_RGB2GRAY);
      
      // Red: 0.299 * 255 = 76.245 ≈ 76
      expect(dest.get(0, 0)).toBe(76);
      // Green: 0.587 * 255 = 149.685 ≈ 150  
      expect(dest.get(0, 1)).toBe(150);
      // Blue: 0.114 * 255 = 29.07 ≈ 29
      expect(dest.get(1, 0)).toBe(29);
      // Gray: 0.299*128 + 0.587*128 + 0.114*128 = 128
      expect(dest.get(1, 1)).toBe(128);
    });

    it("should convert BGR to RGB correctly", () => {
      // BGR input: blue=255, green=0, red=0
      const src = Mat.fromArray([
        255, 0, 0, 0, 255, 0,
        0, 0, 255, 128, 128, 128
      ], [2, 2, 3], "uint8");
      const dest = new Mat();
      
      cv.cvtColor(src, dest, COLOR_BGR2RGB);
      
      // BGR [255,0,0] -> RGB [0,0,255] (blue channel becomes red)
      const destData = dest.tensor.data as Uint8Array;
      expect(destData[0]).toBe(0);  // R
      expect(destData[1]).toBe(0);  // G
      expect(destData[2]).toBe(255); // B
    });

    it("should handle black and white correctly", () => {
      const src = Mat.fromArray([
        0, 0, 0, 255, 255, 255
      ], [1, 2, 3], "uint8");
      const dest = new Mat();
      
      cv.cvtColor(src, dest, COLOR_RGB2GRAY);
      
      expect(dest.get(0, 0)).toBe(0);   // Black -> 0
      expect(dest.get(0, 1)).toBe(255); // White -> 255
    });
  });

  describe("Error handling", () => {
    it("should handle empty source matrix", () => {
      const src = new Mat();
      const dest = new Mat();
      
      expect(() => cv.cvtColor(src, dest, COLOR_RGB2GRAY)).toThrow();
    });

    it("should handle empty destination matrix", () => {
      const src = Mat.fromArray([
        255, 0, 0, 0, 255, 0
      ], [1, 2, 3], "uint8");
      const dest = new Mat();
      
      expect(() => cv.cvtColor(src, dest, COLOR_RGB2GRAY)).not.toThrow();
    });

    it("should handle unsupported color conversion", () => {
      const src = Mat.fromArray([
        255, 0, 0, 0, 255, 0
      ], [1, 2, 3], "uint8");
      const dest = new Mat();
      
      expect(() => cv.cvtColor(src, dest, 999)).toThrow();
    });

    it("should handle insufficient channels for BGR2RGB", () => {
      const src = Mat.fromArray([255, 128, 64, 192], [2, 2], "uint8");
      const dest = new Mat();
      
      expect(() => cv.cvtColor(src, dest, COLOR_BGR2RGB)).toThrow();
    });

    it("should handle insufficient channels for RGB2GRAY", () => {
      const src = Mat.fromArray([255, 128, 64, 192], [2, 2], "uint8");
      const dest = new Mat();
      
      expect(() => cv.cvtColor(src, dest, COLOR_RGB2GRAY)).toThrow();
    });
  });

  describe("Different input types", () => {
    it("should work with uint8 3-channel images", () => {
      const src = Mat.fromArray([
        255, 0, 0, 0, 255, 0
      ], [1, 2, 3], "uint8");
      const dest = new Mat();
      
      expect(() => cv.cvtColor(src, dest, COLOR_RGB2GRAY)).not.toThrow();
    });

    it("should work with different image sizes", () => {
      const src = Mat.fromArray([
        255, 0, 0, 0, 255, 0, 0, 0, 255, 128, 128, 128,
        64, 64, 64, 192, 192, 192, 32, 32, 32, 224, 224, 224
      ], [2, 4, 3], "uint8");
      const dest = new Mat();
      
      expect(() => cv.cvtColor(src, dest, COLOR_RGB2GRAY)).not.toThrow();
    });
  });
});
