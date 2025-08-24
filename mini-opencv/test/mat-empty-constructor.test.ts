import { describe, it, expect } from "vitest";
import { Mat, MatVector } from "../src/index.js";

describe("Mat Empty Constructor", () => {
  describe("Basic Empty Constructor", () => {
    it("should create empty matrix with no arguments", () => {
      const mat = new Mat();
      
      expect(mat.rows).toBe(0);
      expect(mat.cols).toBe(0);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([0, 0]);
      expect(mat.tensor.type).toBe("uint8");
    });

    it("should create empty matrix with empty tensor", () => {
      const mat = new Mat();
      
      expect(mat.tensor.data.length).toBe(0);
      expect(mat.tensor.dims).toEqual([0, 0]);
    });
  });

  describe("Integration with Existing Constructors", () => {
    it("should work alongside tensor constructor", async () => {
      const emptyMat = new Mat();
      const tensorMat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", new Uint8Array([1, 2, 3, 4]), [2, 2]));
      
      expect(emptyMat.rows).toBe(0);
      expect(emptyMat.cols).toBe(0);
      expect(tensorMat.rows).toBe(2);
      expect(tensorMat.cols).toBe(2);
    });

    it("should work alongside dimension constructor", () => {
      const emptyMat = new Mat();
      const dimMat = new Mat(2, 2, "float32");
      
      expect(emptyMat.rows).toBe(0);
      expect(emptyMat.cols).toBe(0);
      expect(dimMat.rows).toBe(2);
      expect(dimMat.cols).toBe(2);
    });
  });

  describe("Matrix Operations on Empty Matrix", () => {
    it("should handle get operations on empty matrix", () => {
      const mat = new Mat();
      
      // Should throw error for get on empty matrix
      expect(() => mat.get(0, 0)).toThrow();
    });

    it("should handle set operations on empty matrix", () => {
      const mat = new Mat();
      
      // Should throw error for set on empty matrix
      expect(() => mat.set(0, 0, 5)).toThrow();
    });

    it("should handle shape property on empty matrix", () => {
      const mat = new Mat();
      
      expect(mat.shape).toEqual([0, 0]);
    });

    it("should handle data property on empty matrix", () => {
      const mat = new Mat();
      
      expect(mat.data.length).toBe(0);
    });
  });

  describe("Integration with MatVector", () => {
    it("should work with MatVector operations", () => {
      const matVector = new MatVector();
      const emptyMat = new Mat();
      
      matVector.push_back(emptyMat);
      
      expect(matVector.size()).toBe(1);
      expect(matVector.get(0).rows).toBe(0);
      expect(matVector.get(0).cols).toBe(0);
    });
  });
});
