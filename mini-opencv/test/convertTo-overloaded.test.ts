import { describe, it, expect } from "vitest";
import { Mat, CV_8U } from "../src/index.js";

describe("Overloaded convertTo Function", () => {
  describe("convertTo with destination matrix and scale", () => {
    it("should have overloaded convertTo function", () => {
      const src = Mat.fromArray([0.5, 1.0, 0.25, 0.75], [2, 2], "float32");
      const dest = new Mat();
      
      expect(() => src.convertTo(dest, CV_8U, 255.0)).not.toThrow();
    });

    it("should convert float32 to uint8 with scale", () => {
      const src = Mat.fromArray([0.5, 1.0, 0.25, 0.75], [2, 2], "float32");
      const dest = new Mat();
      
      src.convertTo(dest, CV_8U, 255.0);
      
      expect(dest.rows).toBe(2);
      expect(dest.cols).toBe(2);
      expect(dest.tensor.type).toBe("uint8");
    });

    it("should work with different scale values", () => {
      const src = Mat.fromArray([0.5, 1.0, 0.25, 0.75], [2, 2], "float32");
      const dest = new Mat();
      
      expect(() => src.convertTo(dest, CV_8U, 100.0)).not.toThrow();
      expect(() => src.convertTo(dest, CV_8U, 255.0)).not.toThrow();
      expect(() => src.convertTo(dest, CV_8U, 1.0)).not.toThrow();
    });

    it("should work with different data types", () => {
      const src = Mat.fromArray([0.5, 1.0, 0.25, 0.75], [2, 2], "float32");
      const dest = new Mat();
      
      expect(() => src.convertTo(dest, CV_8U, 255.0)).not.toThrow();
    });

    it("should work with larger matrices", () => {
      const src = Mat.fromArray([
        0.1, 0.2, 0.3, 0.4, 0.5, 0.6,
        0.7, 0.8, 0.9, 1.0, 0.0, 0.1
      ], [2, 6], "float32");
      const dest = new Mat();
      
      expect(() => src.convertTo(dest, CV_8U, 255.0)).not.toThrow();
    });
  });

  describe("Integration with existing return-based function", () => {
    it("should work alongside return-based convertTo", () => {
      const src = Mat.fromArray([0.5, 1.0, 0.25, 0.75], [2, 2], "float32");
      
      // Return-based version
      const result1 = src.convertTo("uint8");
      
      // Destination-based version
      const dest = new Mat();
      src.convertTo(dest, CV_8U, 255.0);
      
      expect(result1.rows).toBe(dest.rows);
      expect(result1.cols).toBe(dest.cols);
      expect(result1.tensor.type).toBe(dest.tensor.type);
    });

    it("should produce equivalent results with default scale", () => {
      const src = Mat.fromArray([0.5, 1.0, 0.25, 0.75], [2, 2], "float32");
      
      // Return-based version
      const result1 = src.convertTo("uint8");
      
      // Destination-based version with scale 1.0 (default)
      const dest = new Mat();
      src.convertTo(dest, CV_8U, 1.0);
      
      expect(result1.rows).toBe(dest.rows);
      expect(result1.cols).toBe(dest.cols);
    });
  });

  describe("Conversion behavior", () => {
    it("should scale values correctly", () => {
      const src = Mat.fromArray([0.5, 1.0, 0.25, 0.75], [2, 2], "float32");
      const dest = new Mat();
      
      src.convertTo(dest, CV_8U, 255.0);
      
      // Check that values are scaled appropriately
      expect(dest.rows).toBe(2);
      expect(dest.cols).toBe(2);
      
      // Values should be scaled: 0.5 * 255 = 127.5, rounded to 128
      expect(dest.get(0, 0)).toBe(128);
      expect(dest.get(0, 1)).toBe(255); // 1.0 * 255 = 255
    });

    it("should handle zero values", () => {
      const src = Mat.fromArray([0.0, 0.0, 0.0, 0.0], [2, 2], "float32");
      const dest = new Mat();
      
      src.convertTo(dest, CV_8U, 255.0);
      
      expect(dest.get(0, 0)).toBe(0);
      expect(dest.get(0, 1)).toBe(0);
    });

    it("should handle maximum values", () => {
      const src = Mat.fromArray([1.0, 1.0, 1.0, 1.0], [2, 2], "float32");
      const dest = new Mat();
      
      src.convertTo(dest, CV_8U, 255.0);
      
      expect(dest.get(0, 0)).toBe(255);
      expect(dest.get(0, 1)).toBe(255);
    });
  });

  describe("Error handling", () => {
    it("should handle empty source matrix", () => {
      const src = new Mat();
      const dest = new Mat();
      
      expect(() => src.convertTo(dest, CV_8U, 255.0)).toThrow();
    });

    it("should handle empty destination matrix", () => {
      const src = Mat.fromArray([0.5, 1.0, 0.25, 0.75], [2, 2], "float32");
      const dest = new Mat();
      
      expect(() => src.convertTo(dest, CV_8U, 255.0)).not.toThrow();
    });

    it("should handle invalid scale values", () => {
      const src = Mat.fromArray([0.5, 1.0, 0.25, 0.75], [2, 2], "float32");
      const dest = new Mat();
      
      expect(() => src.convertTo(dest, CV_8U, 0.0)).not.toThrow();
      expect(() => src.convertTo(dest, CV_8U, -1.0)).not.toThrow();
    });
  });

  describe("Different data types", () => {
    it("should work with float32 source", () => {
      const src = Mat.fromArray([0.5, 1.0, 0.25, 0.75], [2, 2], "float32");
      const dest = new Mat();
      
      expect(() => src.convertTo(dest, CV_8U, 255.0)).not.toThrow();
    });

    it("should work with uint8 source", () => {
      const src = Mat.fromArray([128, 255, 64, 192], [2, 2], "uint8");
      const dest = new Mat();
      
      expect(() => src.convertTo(dest, CV_8U, 1.0)).not.toThrow();
    });
  });
});
