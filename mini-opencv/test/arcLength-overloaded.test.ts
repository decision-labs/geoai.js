import { describe, it, expect } from "vitest";
import * as cv from "../src/index.js";
import { Mat, Point } from "../src/index.js";

describe("Overloaded arcLength Function", () => {
  describe("arcLength with Mat contours", () => {
    it("should have overloaded arcLength function", () => {
      // Create a simple square contour as a Mat
      const contour = Mat.fromArray([
        0, 0, 10, 0, 10, 10, 0, 10
      ], [4, 2], "float32");
      
      expect(() => cv.arcLength(contour, true)).not.toThrow();
    });

    it("should calculate perimeter of square contour Mat", () => {
      // Square contour: (0,0) -> (10,0) -> (10,10) -> (0,10)
      const contour = Mat.fromArray([
        0, 0, 10, 0, 10, 10, 0, 10
      ], [4, 2], "float32");
      
      const perimeter = cv.arcLength(contour, true);
      
      // Expected: 10 + 10 + 10 + 10 = 40
      expect(perimeter).toBeCloseTo(40, 1);
    });

    it("should calculate perimeter of triangle contour Mat", () => {
      // Triangle contour: (0,0) -> (3,0) -> (0,4)
      const contour = Mat.fromArray([
        0, 0, 3, 0, 0, 4
      ], [3, 2], "float32");
      
      const perimeter = cv.arcLength(contour, true);
      
      // Expected: 3 + 4 + 5 = 12 (3-4-5 triangle)
      expect(perimeter).toBeCloseTo(12, 1);
    });

    it("should handle open contours", () => {
      // Line segments: (0,0) -> (10,0) -> (10,10)
      const contour = Mat.fromArray([
        0, 0, 10, 0, 10, 10
      ], [3, 2], "float32");
      
      const perimeter = cv.arcLength(contour, false);
      
      // Expected: 10 + 10 = 20 (open contour, no closing edge)
      expect(perimeter).toBeCloseTo(20, 1);
    });

    it("should handle closed vs open contours differently", () => {
      const contour = Mat.fromArray([
        0, 0, 10, 0, 10, 10
      ], [3, 2], "float32");
      
      const closedLength = cv.arcLength(contour, true);
      const openLength = cv.arcLength(contour, false);
      
      // Closed should be longer due to closing edge
      expect(closedLength).toBeGreaterThan(openLength);
    });
  });

  describe("Integration with existing Point[] function", () => {
    it("should work alongside Point[] arcLength", () => {
      // Same square contour as Point[]
      const pointsContour = [
        new Point(0, 0),
        new Point(10, 0),
        new Point(10, 10),
        new Point(0, 10)
      ];
      
      // Same square contour as Mat
      const matContour = Mat.fromArray([
        0, 0, 10, 0, 10, 10, 0, 10
      ], [4, 2], "float32");
      
      const pointsLength = cv.arcLength(pointsContour, true);
      const matLength = cv.arcLength(matContour, true);
      
      expect(pointsLength).toBeCloseTo(matLength, 2);
    });

    it("should produce equivalent results for open contours", () => {
      const pointsContour = [
        new Point(0, 0),
        new Point(10, 0),
        new Point(10, 10)
      ];
      
      const matContour = Mat.fromArray([
        0, 0, 10, 0, 10, 10
      ], [3, 2], "float32");
      
      const pointsLength = cv.arcLength(pointsContour, false);
      const matLength = cv.arcLength(matContour, false);
      
      expect(pointsLength).toBeCloseTo(matLength, 2);
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle empty contour matrix", () => {
      const contour = new Mat();
      
      expect(() => cv.arcLength(contour, true)).toThrow();
    });

    it("should handle single point contour", () => {
      const contour = Mat.fromArray([5, 5], [1, 2], "float32");
      
      const length = cv.arcLength(contour, true);
      expect(length).toBe(0);
    });

    it("should handle two point contour", () => {
      const contour = Mat.fromArray([0, 0, 10, 0], [2, 2], "float32");
      
      const length = cv.arcLength(contour, false);
      expect(length).toBeCloseTo(10, 1);
    });

    it("should handle malformed contour matrix", () => {
      // Wrong number of columns (should be 2 for x,y coordinates)
      const contour = Mat.fromArray([0, 0, 0, 10, 0, 0], [2, 3], "float32");
      
      expect(() => cv.arcLength(contour, true)).toThrow();
    });

    it("should handle contour with zero dimensions", () => {
      const contour = Mat.fromArray([], [0, 2], "float32");
      
      expect(() => cv.arcLength(contour, true)).toThrow();
    });
  });

  describe("Different data types", () => {
    it("should work with float32 data", () => {
      const contour = Mat.fromArray([
        0.5, 0.5, 10.5, 0.5, 10.5, 10.5, 0.5, 10.5
      ], [4, 2], "float32");
      
      expect(() => cv.arcLength(contour, true)).not.toThrow();
    });

    it("should work with integer coordinates", () => {
      const contour = Mat.fromArray([
        0, 0, 10, 0, 10, 10, 0, 10
      ], [4, 2], "uint8");
      
      expect(() => cv.arcLength(contour, true)).not.toThrow();
    });

    it("should handle negative coordinates", () => {
      const contour = Mat.fromArray([
        -5, -5, 5, -5, 5, 5, -5, 5
      ], [4, 2], "float32");
      
      const length = cv.arcLength(contour, true);
      expect(length).toBeCloseTo(40, 1); // Same 10x10 square, just offset
    });
  });

  describe("Precision and accuracy", () => {
    it("should calculate accurate diagonal distances", () => {
      // Right triangle with diagonal
      const contour = Mat.fromArray([
        0, 0, 3, 0, 0, 4
      ], [3, 2], "float32");
      
      const length = cv.arcLength(contour, true);
      
      // 3 + 4 + 5 = 12 (Pythagorean triangle)
      expect(length).toBeCloseTo(12, 2);
    });

    it("should handle very small distances", () => {
      const contour = Mat.fromArray([
        0, 0, 0.1, 0, 0.1, 0.1, 0, 0.1
      ], [4, 2], "float32");
      
      const length = cv.arcLength(contour, true);
      expect(length).toBeCloseTo(0.4, 3);
    });

    it("should handle very large distances", () => {
      const contour = Mat.fromArray([
        0, 0, 1000, 0, 1000, 1000, 0, 1000
      ], [4, 2], "float32");
      
      const length = cv.arcLength(contour, true);
      expect(length).toBeCloseTo(4000, 1);
    });
  });
});
