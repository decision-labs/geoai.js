import { describe, it, expect } from "vitest";
import { Mat, Canny } from "../src/index.js";

describe("Overloaded Canny Function", () => {
  describe("Canny with destination matrix and thresholds", () => {
    it("should have overloaded Canny function", () => {
      const src = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      const dest = new Mat();
      
      expect(() => Canny(src, dest, 100, 200)).not.toThrow();
    });

    it("should perform edge detection into destination", () => {
      const src = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      const dest = new Mat();
      
      Canny(src, dest, 100, 200);
      
      expect(dest.rows).toBe(2);
      expect(dest.cols).toBe(2);
      expect(dest.tensor.type).toBe("uint8");
    });

    it("should work with different threshold values", () => {
      const src = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      const dest = new Mat();
      
      expect(() => Canny(src, dest, 50, 150)).not.toThrow();
      expect(() => Canny(src, dest, 200, 300)).not.toThrow();
    });

    it("should work with larger matrices", () => {
      const src = Mat.fromArray([
        0, 255, 0, 255, 0, 255,
        255, 0, 255, 0, 255, 0,
        0, 255, 0, 255, 0, 255
      ], [3, 6], "uint8");
      const dest = new Mat();
      
      expect(() => Canny(src, dest, 100, 200)).not.toThrow();
    });

    it("should work with empty destination matrix", () => {
      const src = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      const dest = new Mat();
      
      expect(() => Canny(src, dest, 100, 200)).not.toThrow();
    });
  });

  describe("Integration with existing return-based function", () => {
    it("should work alongside return-based Canny", () => {
      const src = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      
      // Return-based version
      const result1 = Canny(src);
      
      // Destination-based version
      const dest = new Mat();
      Canny(src, dest, 100, 200);
      
      expect(result1.rows).toBe(dest.rows);
      expect(result1.cols).toBe(dest.cols);
      expect(result1.tensor.type).toBe(dest.tensor.type);
    });

    it("should produce equivalent results with default thresholds", () => {
      const src = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      
      // Return-based version (uses default thresholds)
      const result1 = Canny(src);
      
      // Destination-based version with default-like thresholds
      const dest = new Mat();
      Canny(src, dest, 100, 200); // Default-like values
      
      // Both should produce valid edge detection results
      expect(result1.rows).toBe(dest.rows);
      expect(result1.cols).toBe(dest.cols);
    });
  });

  describe("Edge detection behavior", () => {
    it("should detect edges in simple patterns", () => {
      const src = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      const dest = new Mat();
      
      Canny(src, dest, 100, 200);
      
      // Should produce edge detection result
      expect(dest.rows).toBe(2);
      expect(dest.cols).toBe(2);
      
      // Check that we have some edge pixels (not all zeros)
      let hasEdges = false;
      for (let y = 0; y < dest.rows; y++) {
        for (let x = 0; x < dest.cols; x++) {
          if (dest.get(y, x) > 0) {
            hasEdges = true;
            break;
          }
        }
      }
      expect(hasEdges).toBe(true);
    });

    it("should handle uniform images", () => {
      const src = Mat.fromArray([255, 255, 255, 255], [2, 2], "uint8");
      const dest = new Mat();
      
      Canny(src, dest, 100, 200);
      
      // Should produce result (even if no edges detected)
      expect(dest.rows).toBe(2);
      expect(dest.cols).toBe(2);
    });
  });

  describe("Error handling", () => {
    it("should handle invalid threshold values", () => {
      const src = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      const dest = new Mat();
      
      // Should handle various threshold combinations
      expect(() => Canny(src, dest, 0, 0)).not.toThrow();
      expect(() => Canny(src, dest, 255, 255)).not.toThrow();
      expect(() => Canny(src, dest, 200, 100)).not.toThrow(); // high threshold < low threshold
    });

    it("should handle different matrix types", () => {
      const src = Mat.fromArray([0.0, 1.0, 0.0, 1.0], [2, 2], "float32");
      const dest = new Mat();
      
      expect(() => Canny(src, dest, 100, 200)).not.toThrow();
    });
  });
});
