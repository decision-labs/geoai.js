import { describe, it, expect } from "vitest";
import * as cv from "../src/index.js";
import { Mat, Point } from "../src/index.js";

describe("Overloaded approxPolyDP Function", () => {
  describe("approxPolyDP with destination Mat", () => {
    it("should have overloaded approxPolyDP function", () => {
      // Create a complex contour as Point[]
      const contour = [
        new Point(0, 0),
        new Point(1, 0),
        new Point(2, 0),
        new Point(3, 0),
        new Point(10, 0),
        new Point(10, 10),
        new Point(0, 10)
      ];
      const dest = new Mat();
      
      expect(() => cv.approxPolyDP(contour, dest, 2.0, true)).not.toThrow();
    });

    it("should simplify complex contour to destination Mat", () => {
      // Create a contour that can be simplified
      const contour = [
        new Point(0, 0),
        new Point(1, 0),   // Collinear point
        new Point(2, 0),   // Collinear point
        new Point(10, 0),  // End of first edge
        new Point(10, 10), // Corner
        new Point(0, 10),  // Corner
        new Point(0, 5),   // Point on edge
        new Point(0, 0)    // Back to start
      ];
      const dest = new Mat();
      
      cv.approxPolyDP(contour, dest, 2.0, true);
      
      // Should simplify to fewer points
      expect(dest.rows).toBeGreaterThan(0);
      expect(dest.cols).toBe(2);
      expect(dest.rows).toBeLessThan(contour.length);
    });

    it("should work with open contours", () => {
      const contour = [
        new Point(0, 0),
        new Point(1, 0),
        new Point(2, 0),
        new Point(10, 0),
        new Point(10, 10)
      ];
      const dest = new Mat();
      
      expect(() => cv.approxPolyDP(contour, dest, 2.0, false)).not.toThrow();
    });

    it("should handle different epsilon values", () => {
      const contour = [
        new Point(0, 0),
        new Point(1, 0),
        new Point(2, 0),
        new Point(10, 0),
        new Point(10, 10),
        new Point(0, 10)
      ];
      const dest1 = new Mat();
      const dest2 = new Mat();
      
      cv.approxPolyDP(contour, dest1, 0.5, true);  // Low epsilon (more points)
      cv.approxPolyDP(contour, dest2, 5.0, true);  // High epsilon (fewer points)
      
      expect(dest1.rows).toBeGreaterThanOrEqual(dest2.rows);
    });
  });

  describe("Integration with existing Point[] function", () => {
    it("should work alongside return-based approxPolyDP", () => {
      const contour = [
        new Point(0, 0),
        new Point(1, 0),
        new Point(2, 0),
        new Point(10, 0),
        new Point(10, 10),
        new Point(0, 10)
      ];
      
      // Return-based version
      const result1 = cv.approxPolyDP(contour, 2.0, true);
      
      // Destination-based version
      const dest = new Mat();
      cv.approxPolyDP(contour, dest, 2.0, true);
      
      expect(result1.length).toBe(dest.rows);
    });

    it("should produce equivalent results", () => {
      const contour = [
        new Point(0, 0),
        new Point(5, 0),
        new Point(10, 0),
        new Point(10, 10),
        new Point(0, 10)
      ];
      
      // Return-based version
      const result1 = cv.approxPolyDP(contour, 2.0, true);
      
      // Destination-based version
      const dest = new Mat();
      cv.approxPolyDP(contour, dest, 2.0, true);
      
      // Check that coordinates match
      expect(dest.rows).toBe(result1.length);
      for (let i = 0; i < result1.length; i++) {
        expect(dest.get(i, 0)).toBeCloseTo(result1[i].x, 2);
        expect(dest.get(i, 1)).toBeCloseTo(result1[i].y, 2);
      }
    });

    it("should handle open vs closed contours consistently", () => {
      const contour = [
        new Point(0, 0),
        new Point(1, 0),
        new Point(2, 0),
        new Point(10, 0),
        new Point(10, 10)
      ];
      
      // Return-based versions
      const resultClosed = cv.approxPolyDP(contour, 2.0, true);
      const resultOpen = cv.approxPolyDP(contour, 2.0, false);
      
      // Destination-based versions
      const destClosed = new Mat();
      const destOpen = new Mat();
      cv.approxPolyDP(contour, destClosed, 2.0, true);
      cv.approxPolyDP(contour, destOpen, 2.0, false);
      
      expect(destClosed.rows).toBe(resultClosed.length);
      expect(destOpen.rows).toBe(resultOpen.length);
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle empty contour", () => {
      const contour: Point[] = [];
      const dest = new Mat();
      
      expect(() => cv.approxPolyDP(contour, dest, 2.0, true)).toThrow();
    });

    it("should handle single point contour", () => {
      const contour = [new Point(5, 5)];
      const dest = new Mat();
      
      expect(() => cv.approxPolyDP(contour, dest, 2.0, true)).not.toThrow();
      expect(dest.rows).toBe(1);
    });

    it("should handle two point contour", () => {
      const contour = [new Point(0, 0), new Point(10, 0)];
      const dest = new Mat();
      
      expect(() => cv.approxPolyDP(contour, dest, 2.0, false)).not.toThrow();
      expect(dest.rows).toBe(2);
    });

    it("should handle negative epsilon", () => {
      const contour = [new Point(0, 0), new Point(10, 0), new Point(10, 10)];
      const dest = new Mat();
      
      expect(() => cv.approxPolyDP(contour, dest, -1.0, true)).not.toThrow();
    });

    it("should handle zero epsilon", () => {
      const contour = [new Point(0, 0), new Point(10, 0), new Point(10, 10)];
      const dest = new Mat();
      
      expect(() => cv.approxPolyDP(contour, dest, 0.0, true)).not.toThrow();
    });

    it("should handle very small epsilon", () => {
      const contour = [
        new Point(0, 0),
        new Point(0.1, 0),
        new Point(10, 0),
        new Point(10, 10)
      ];
      const dest = new Mat();
      
      expect(() => cv.approxPolyDP(contour, dest, 0.01, true)).not.toThrow();
    });
  });

  describe("Approximation behavior", () => {
    it("should preserve corner points in rectangle", () => {
      // Perfect rectangle
      const contour = [
        new Point(0, 0),
        new Point(10, 0),
        new Point(10, 10),
        new Point(0, 10)
      ];
      const dest = new Mat();
      
      cv.approxPolyDP(contour, dest, 1.0, true);
      
      // Should preserve all 4 corners
      expect(dest.rows).toBe(4);
    });

    it("should remove collinear points", () => {
      // Line with extra points
      const contour = [
        new Point(0, 0),
        new Point(1, 0),   // Collinear
        new Point(2, 0),   // Collinear
        new Point(3, 0),   // Collinear
        new Point(10, 0),  // End point
        new Point(10, 10), // Corner
        new Point(0, 10),  // Corner
      ];
      const dest = new Mat();
      
      cv.approxPolyDP(contour, dest, 1.0, true);
      
      // Should be simplified to fewer points
      expect(dest.rows).toBeLessThan(contour.length);
      expect(dest.rows).toBeGreaterThanOrEqual(3);
    });

    it("should handle complex polygons", () => {
      // Create a more complex polygon
      const contour = [
        new Point(0, 0),
        new Point(2, 1),
        new Point(4, 0),
        new Point(6, 2),
        new Point(8, 0),
        new Point(10, 0),
        new Point(10, 10),
        new Point(8, 9),
        new Point(6, 10),
        new Point(4, 8),
        new Point(2, 10),
        new Point(0, 10)
      ];
      const dest = new Mat();
      
      cv.approxPolyDP(contour, dest, 2.0, true);
      
      expect(dest.rows).toBeGreaterThan(0);
      expect(dest.rows).toBeLessThanOrEqual(contour.length);
    });
  });

  describe("Data types and precision", () => {
    it("should work with float32 destination", () => {
      const contour = [
        new Point(0.5, 0.5),
        new Point(10.5, 0.5),
        new Point(10.5, 10.5),
        new Point(0.5, 10.5)
      ];
      const dest = new Mat();
      
      cv.approxPolyDP(contour, dest, 1.0, true);
      
      expect(dest.tensor.type).toBe("float32");
    });

    it("should preserve coordinate precision", () => {
      const contour = [
        new Point(0.123, 0.456),
        new Point(10.789, 0.456),
        new Point(10.789, 10.123),
        new Point(0.123, 10.123)
      ];
      const dest = new Mat();
      
      cv.approxPolyDP(contour, dest, 0.1, true);
      
      // Should preserve precision
      expect(dest.get(0, 0)).toBeCloseTo(0.123, 2);
      expect(dest.get(0, 1)).toBeCloseTo(0.456, 2);
    });

    it("should handle large coordinates", () => {
      const contour = [
        new Point(1000, 1000),
        new Point(2000, 1000),
        new Point(2000, 2000),
        new Point(1000, 2000)
      ];
      const dest = new Mat();
      
      expect(() => cv.approxPolyDP(contour, dest, 10.0, true)).not.toThrow();
    });

    it("should handle negative coordinates", () => {
      const contour = [
        new Point(-10, -10),
        new Point(0, -10),
        new Point(0, 0),
        new Point(-10, 0)
      ];
      const dest = new Mat();
      
      expect(() => cv.approxPolyDP(contour, dest, 1.0, true)).not.toThrow();
    });
  });
});
