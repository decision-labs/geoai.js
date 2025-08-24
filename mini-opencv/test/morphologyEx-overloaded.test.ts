import { describe, it, expect } from "vitest";
import { Mat, morphologyEx, MORPH_CLOSE } from "../src/index.js";

describe("Overloaded morphologyEx Function", () => {
  describe("morphologyEx with destination matrix", () => {
    it("should have overloaded morphologyEx function", () => {
      const src = Mat.fromArray([1, 0, 1, 0], [2, 2], "uint8");
      const kernel = Mat.ones(3, 3, "uint8");
      const dest = new Mat();
      
      expect(() => morphologyEx(src, MORPH_CLOSE, kernel, dest)).not.toThrow();
    });

    it("should perform morphological operation into destination", () => {
      const src = Mat.fromArray([1, 0, 1, 0], [2, 2], "uint8");
      const kernel = Mat.ones(3, 3, "uint8");
      const dest = new Mat();
      
      morphologyEx(src, MORPH_CLOSE, kernel, dest);
      
      expect(dest.rows).toBe(2);
      expect(dest.cols).toBe(2);
      expect(dest.tensor.type).toBe("uint8");
    });

    it("should work with different kernel sizes", () => {
      const src = Mat.fromArray([1, 0, 1, 0, 1, 0, 1, 0, 1], [3, 3], "uint8");
      const kernel = Mat.ones(5, 5, "uint8");
      const dest = new Mat();
      
      expect(() => morphologyEx(src, MORPH_CLOSE, kernel, dest)).not.toThrow();
    });

    it("should work with empty destination matrix", () => {
      const src = Mat.fromArray([1, 0, 1, 0], [2, 2], "uint8");
      const kernel = Mat.ones(3, 3, "uint8");
      const dest = new Mat();
      
      expect(() => morphologyEx(src, MORPH_CLOSE, kernel, dest)).not.toThrow();
    });
  });

  describe("Integration with existing return-based function", () => {
    it("should work alongside return-based morphologyEx", () => {
      const src = Mat.fromArray([1, 0, 1, 0], [2, 2], "uint8");
      const kernel = Mat.ones(3, 3, "uint8");
      
      // Return-based version
      const result1 = morphologyEx(src, MORPH_CLOSE, kernel);
      
      // Destination-based version
      const dest = new Mat();
      morphologyEx(src, MORPH_CLOSE, kernel, dest);
      
      expect(result1.rows).toBe(dest.rows);
      expect(result1.cols).toBe(dest.cols);
      expect(result1.tensor.type).toBe(dest.tensor.type);
    });

    it("should produce equivalent results", () => {
      const src = Mat.fromArray([1, 0, 1, 0], [2, 2], "uint8");
      const kernel = Mat.ones(3, 3, "uint8");
      
      // Return-based version
      const result1 = morphologyEx(src, MORPH_CLOSE, kernel);
      
      // Destination-based version
      const dest = new Mat();
      morphologyEx(src, MORPH_CLOSE, kernel, dest);
      
      // Compare pixel values
      for (let y = 0; y < result1.rows; y++) {
        for (let x = 0; x < result1.cols; x++) {
          expect(result1.get(y, x)).toBe(dest.get(y, x));
        }
      }
    });
  });

  describe("Error handling", () => {
    it("should throw error for unsupported operation", () => {
      const src = Mat.fromArray([1, 0, 1, 0], [2, 2], "uint8");
      const kernel = Mat.ones(3, 3, "uint8");
      const dest = new Mat();
      
      expect(() => morphologyEx(src, 999, kernel, dest)).toThrow();
    });

    it("should handle different matrix types", () => {
      const src = Mat.fromArray([1.0, 0.0, 1.0, 0.0], [2, 2], "float32");
      const kernel = Mat.ones(3, 3, "uint8");
      const dest = new Mat();
      
      expect(() => morphologyEx(src, MORPH_CLOSE, kernel, dest)).not.toThrow();
    });
  });
});
