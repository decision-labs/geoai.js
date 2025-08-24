import { describe, it, expect } from "vitest";
import { Mat, MatVector, hconcat, vconcat } from "../src/index.js";

describe("Overloaded Concat Functions", () => {
  describe("hconcat with MatVector and destination", () => {
    it("should have overloaded hconcat function", () => {
      const mat1 = new Mat(2, 2, "float32");
      const mat2 = new Mat(2, 2, "float32");
      const matVector = new MatVector();
      matVector.push_back(mat1);
      matVector.push_back(mat2);
      const dest = new Mat();
      
      expect(() => hconcat(matVector, dest)).not.toThrow();
    });

    it("should concatenate matrices horizontally into destination", () => {
      const mat1 = Mat.fromArray([1, 2, 3, 4], [2, 2], "float32");
      const mat2 = Mat.fromArray([5, 6, 7, 8], [2, 2], "float32");
      const matVector = new MatVector();
      matVector.push_back(mat1);
      matVector.push_back(mat2);
      const dest = new Mat();
      
      hconcat(matVector, dest);
      
      expect(dest.rows).toBe(2);
      expect(dest.cols).toBe(4);
      expect(dest.get(0, 0)).toBe(1);
      expect(dest.get(0, 1)).toBe(2);
      expect(dest.get(0, 2)).toBe(5);
      expect(dest.get(0, 3)).toBe(6);
      expect(dest.get(1, 0)).toBe(3);
      expect(dest.get(1, 1)).toBe(4);
      expect(dest.get(1, 2)).toBe(7);
      expect(dest.get(1, 3)).toBe(8);
    });

    it("should work with empty MatVector", () => {
      const matVector = new MatVector();
      const dest = new Mat();
      
      expect(() => hconcat(matVector, dest)).toThrow();
    });

    it("should work with single matrix in MatVector", () => {
      const mat = Mat.fromArray([1, 2, 3, 4], [2, 2], "float32");
      const matVector = new MatVector();
      matVector.push_back(mat);
      const dest = new Mat();
      
      hconcat(matVector, dest);
      
      expect(dest.rows).toBe(2);
      expect(dest.cols).toBe(2);
      expect(dest.get(0, 0)).toBe(1);
      expect(dest.get(0, 1)).toBe(2);
      expect(dest.get(1, 0)).toBe(3);
      expect(dest.get(1, 1)).toBe(4);
    });
  });

  describe("vconcat with MatVector and destination", () => {
    it("should have overloaded vconcat function", () => {
      const mat1 = new Mat(2, 2, "float32");
      const mat2 = new Mat(2, 2, "float32");
      const matVector = new MatVector();
      matVector.push_back(mat1);
      matVector.push_back(mat2);
      const dest = new Mat();
      
      expect(() => vconcat(matVector, dest)).not.toThrow();
    });

    it("should concatenate matrices vertically into destination", () => {
      const mat1 = Mat.fromArray([1, 2, 3, 4], [2, 2], "float32");
      const mat2 = Mat.fromArray([5, 6, 7, 8], [2, 2], "float32");
      const matVector = new MatVector();
      matVector.push_back(mat1);
      matVector.push_back(mat2);
      const dest = new Mat();
      
      vconcat(matVector, dest);
      
      expect(dest.rows).toBe(4);
      expect(dest.cols).toBe(2);
      expect(dest.get(0, 0)).toBe(1);
      expect(dest.get(0, 1)).toBe(2);
      expect(dest.get(1, 0)).toBe(3);
      expect(dest.get(1, 1)).toBe(4);
      expect(dest.get(2, 0)).toBe(5);
      expect(dest.get(2, 1)).toBe(6);
      expect(dest.get(3, 0)).toBe(7);
      expect(dest.get(3, 1)).toBe(8);
    });

    it("should work with empty MatVector", () => {
      const matVector = new MatVector();
      const dest = new Mat();
      
      expect(() => vconcat(matVector, dest)).toThrow();
    });

    it("should work with single matrix in MatVector", () => {
      const mat = Mat.fromArray([1, 2, 3, 4], [2, 2], "float32");
      const matVector = new MatVector();
      matVector.push_back(mat);
      const dest = new Mat();
      
      vconcat(matVector, dest);
      
      expect(dest.rows).toBe(2);
      expect(dest.cols).toBe(2);
      expect(dest.get(0, 0)).toBe(1);
      expect(dest.get(0, 1)).toBe(2);
      expect(dest.get(1, 0)).toBe(3);
      expect(dest.get(1, 1)).toBe(4);
    });
  });

  describe("Integration with existing array-based functions", () => {
    it("should work alongside array-based hconcat", () => {
      const mat1 = Mat.fromArray([1, 2, 3, 4], [2, 2], "float32");
      const mat2 = Mat.fromArray([5, 6, 7, 8], [2, 2], "float32");
      
      // Array-based version
      const result1 = hconcat([mat1, mat2]);
      
      // MatVector-based version
      const matVector = new MatVector();
      matVector.push_back(mat1);
      matVector.push_back(mat2);
      const dest = new Mat();
      hconcat(matVector, dest);
      
      expect(result1.rows).toBe(dest.rows);
      expect(result1.cols).toBe(dest.cols);
      expect(result1.get(0, 0)).toBe(dest.get(0, 0));
      expect(result1.get(0, 1)).toBe(dest.get(0, 1));
      expect(result1.get(0, 2)).toBe(dest.get(0, 2));
      expect(result1.get(0, 3)).toBe(dest.get(0, 3));
    });

    it("should work alongside array-based vconcat", () => {
      const mat1 = Mat.fromArray([1, 2, 3, 4], [2, 2], "float32");
      const mat2 = Mat.fromArray([5, 6, 7, 8], [2, 2], "float32");
      
      // Array-based version
      const result1 = vconcat([mat1, mat2]);
      
      // MatVector-based version
      const matVector = new MatVector();
      matVector.push_back(mat1);
      matVector.push_back(mat2);
      const dest = new Mat();
      vconcat(matVector, dest);
      
      expect(result1.rows).toBe(dest.rows);
      expect(result1.cols).toBe(dest.cols);
      expect(result1.get(0, 0)).toBe(dest.get(0, 0));
      expect(result1.get(0, 1)).toBe(dest.get(0, 1));
      expect(result1.get(1, 0)).toBe(dest.get(1, 0));
      expect(result1.get(1, 1)).toBe(dest.get(1, 1));
    });
  });
});
