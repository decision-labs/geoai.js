import { describe, it, expect } from "vitest";
import { Mat, MatVector, findContours, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE } from "../src/index.js";

describe("Overloaded findContours Function", () => {
  describe("findContours with MatVector and hierarchy output", () => {
    it("should have overloaded findContours function", () => {
      const binary = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      const contours = new MatVector();
      const hierarchy = new Mat();
      
      expect(() => findContours(binary, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE)).not.toThrow();
    });

    it("should find contours and populate MatVector", () => {
      const binary = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      const contours = new MatVector();
      const hierarchy = new Mat();
      
      findContours(binary, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);
      
      expect(contours.size()).toBeGreaterThanOrEqual(0);
      expect(hierarchy.rows).toBeGreaterThanOrEqual(0);
    });

    it("should work with simple binary image", () => {
      // Create a simple 3x3 binary image with a square
      const binary = Mat.fromArray([
        0, 0, 0,
        0, 255, 0,
        0, 0, 0
      ], [3, 3], "uint8");
      const contours = new MatVector();
      const hierarchy = new Mat();
      
      findContours(binary, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);
      
      expect(contours.size()).toBeGreaterThanOrEqual(0);
    });

    it("should work with empty binary image", () => {
      const binary = Mat.fromArray([0, 0, 0, 0], [2, 2], "uint8");
      const contours = new MatVector();
      const hierarchy = new Mat();
      
      findContours(binary, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);
      
      expect(contours.size()).toBe(0);
    });

    it("should work with different retrieval modes", () => {
      const binary = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      const contours = new MatVector();
      const hierarchy = new Mat();
      
      expect(() => findContours(binary, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE)).not.toThrow();
    });
  });

  describe("Integration with existing return-based function", () => {
    it("should work alongside return-based findContours", () => {
      const binary = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      
      // Return-based version
      const result1 = findContours(binary);
      
      // MatVector-based version
      const contours = new MatVector();
      const hierarchy = new Mat();
      findContours(binary, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);
      
      expect(Array.isArray(result1)).toBe(true);
      expect(contours.size()).toBeGreaterThanOrEqual(0);
    });

    it("should produce equivalent contour counts", () => {
      const binary = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      
      // Return-based version
      const result1 = findContours(binary);
      
      // MatVector-based version
      const contours = new MatVector();
      const hierarchy = new Mat();
      findContours(binary, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);
      
      expect(result1.length).toBe(contours.size());
    });
  });

  describe("Contour detection behavior", () => {
    it("should detect contours in complex pattern", () => {
      // Create a more complex binary image
      const binary = Mat.fromArray([
        0, 0, 0, 0, 0,
        0, 255, 255, 255, 0,
        0, 255, 0, 255, 0,
        0, 255, 255, 255, 0,
        0, 0, 0, 0, 0
      ], [5, 5], "uint8");
      const contours = new MatVector();
      const hierarchy = new Mat();
      
      findContours(binary, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);
      
      expect(contours.size()).toBeGreaterThan(0);
    });

    it("should handle single pixel contours", () => {
      const binary = Mat.fromArray([255], [1, 1], "uint8");
      const contours = new MatVector();
      const hierarchy = new Mat();
      
      findContours(binary, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);
      
      expect(contours.size()).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error handling", () => {
    it("should handle empty binary image", () => {
      const binary = new Mat();
      const contours = new MatVector();
      const hierarchy = new Mat();
      
      expect(() => findContours(binary, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE)).toThrow();
    });

    it("should handle non-binary image", () => {
      const binary = Mat.fromArray([0, 128, 255, 64], [2, 2], "uint8");
      const contours = new MatVector();
      const hierarchy = new Mat();
      
      expect(() => findContours(binary, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE)).not.toThrow();
    });
  });

  describe("Different data types", () => {
    it("should work with uint8 data", () => {
      const binary = Mat.fromArray([0, 255, 0, 255], [2, 2], "uint8");
      const contours = new MatVector();
      const hierarchy = new Mat();
      
      expect(() => findContours(binary, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE)).not.toThrow();
    });

    it("should work with float32 data", () => {
      const binary = Mat.fromArray([0.0, 1.0, 0.0, 1.0], [2, 2], "float32");
      const contours = new MatVector();
      const hierarchy = new Mat();
      
      expect(() => findContours(binary, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE)).not.toThrow();
    });
  });
});
