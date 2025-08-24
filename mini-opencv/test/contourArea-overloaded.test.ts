import { describe, it, expect } from "vitest";
import { Mat, contourArea, Point } from "../src/index.js";

describe("Overloaded contourArea Function", () => {
  describe("contourArea with Mat input", () => {
    it("should have overloaded contourArea function", () => {
      const contourMat = Mat.fromArray([0, 0, 1, 0, 1, 1, 0, 1], [4, 2], "uint8");
      
      expect(() => contourArea(contourMat)).not.toThrow();
    });

    it("should calculate area from Mat contour", () => {
      // Create a simple square contour: (0,0), (1,0), (1,1), (0,1)
      const contourMat = Mat.fromArray([0, 0, 1, 0, 1, 1, 0, 1], [4, 2], "uint8");
      
      const area = contourArea(contourMat);
      
      expect(area).toBeGreaterThan(0);
      expect(typeof area).toBe("number");
    });

    it("should work with triangle contour", () => {
      // Create a triangle contour: (0,0), (1,0), (0.5,1)
      const contourMat = Mat.fromArray([0, 0, 1, 0, 0.5, 1], [3, 2], "float32");
      
      const area = contourArea(contourMat);
      
      expect(area).toBeGreaterThan(0);
      expect(typeof area).toBe("number");
    });

    it("should work with single point contour", () => {
      const contourMat = Mat.fromArray([0, 0], [1, 2], "uint8");
      
      const area = contourArea(contourMat);
      
      expect(area).toBe(0); // Single point has no area
    });

    it("should work with two point contour", () => {
      const contourMat = Mat.fromArray([0, 0, 1, 1], [2, 2], "uint8");
      
      const area = contourArea(contourMat);
      
      expect(area).toBe(0); // Line has no area
    });
  });

  describe("Integration with existing Point[] function", () => {
    it("should work alongside Point[] version", () => {
      // Point[] version
      const points = [
        new Point(0, 0),
        new Point(1, 0),
        new Point(1, 1),
        new Point(0, 1)
      ];
      const area1 = contourArea(points);
      
      // Mat version
      const contourMat = Mat.fromArray([0, 0, 1, 0, 1, 1, 0, 1], [4, 2], "uint8");
      const area2 = contourArea(contourMat);
      
      expect(area1).toBe(area2);
    });

    it("should produce equivalent results for same contour", () => {
      // Create same contour in both formats
      const points = [
        new Point(0, 0),
        new Point(2, 0),
        new Point(2, 2),
        new Point(0, 2)
      ];
      const area1 = contourArea(points);
      
      const contourMat = Mat.fromArray([0, 0, 2, 0, 2, 2, 0, 2], [4, 2], "uint8");
      const area2 = contourArea(contourMat);
      
      expect(area1).toBe(area2);
    });
  });

  describe("Area calculation accuracy", () => {
    it("should calculate correct area for square", () => {
      // Square with side length 2: area should be 4
      const contourMat = Mat.fromArray([0, 0, 2, 0, 2, 2, 0, 2], [4, 2], "uint8");
      
      const area = contourArea(contourMat);
      
      expect(area).toBe(4);
    });

    it("should calculate correct area for rectangle", () => {
      // Rectangle 3x2: area should be 6
      const contourMat = Mat.fromArray([0, 0, 3, 0, 3, 2, 0, 2], [4, 2], "uint8");
      
      const area = contourArea(contourMat);
      
      expect(area).toBe(6);
    });

    it("should handle non-integer coordinates", () => {
      // Rectangle with float coordinates
      const contourMat = Mat.fromArray([0.5, 0.5, 2.5, 0.5, 2.5, 2.5, 0.5, 2.5], [4, 2], "float32");
      
      const area = contourArea(contourMat);
      
      expect(area).toBe(4); // 2x2 rectangle
    });
  });

  describe("Error handling", () => {
    it("should handle empty Mat", () => {
      const contourMat = new Mat();
      
      expect(() => contourArea(contourMat)).toThrow();
    });

    it("should handle Mat with wrong dimensions", () => {
      const contourMat = Mat.fromArray([0, 0, 1, 0, 1, 1], [3, 2], "uint8"); // 3 points, should be fine
      
      expect(() => contourArea(contourMat)).not.toThrow();
    });

    it("should handle Mat with single column", () => {
      const contourMat = Mat.fromArray([0, 1, 2], [3, 1], "uint8"); // Only x coordinates
      
      expect(() => contourArea(contourMat)).toThrow();
    });
  });

  describe("Different data types", () => {
    it("should work with uint8 data", () => {
      const contourMat = Mat.fromArray([0, 0, 1, 0, 1, 1, 0, 1], [4, 2], "uint8");
      
      expect(() => contourArea(contourMat)).not.toThrow();
    });

    it("should work with float32 data", () => {
      const contourMat = Mat.fromArray([0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0], [4, 2], "float32");
      
      expect(() => contourArea(contourMat)).not.toThrow();
    });
  });
});
