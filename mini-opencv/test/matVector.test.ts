import { describe, it, expect } from "vitest";
import { MatVector, Mat, CV_8UC1, CV_32F } from "../src/index.js";

describe("MatVector", () => {
  describe("Constructor and Basic Operations", () => {
    it("should create empty MatVector", () => {
      const matVector = new MatVector();

      expect(matVector.size()).toBe(0);
      expect(matVector.empty()).toBe(true);
    });

    it("should create MatVector with initial capacity", () => {
      const matVector = new MatVector(10);

      expect(matVector.size()).toBe(0);
      expect(matVector.empty()).toBe(true);
    });
  });

  describe("Adding and Accessing Elements", () => {
    it("should add matrices and access them by index", () => {
      const matVector = new MatVector();
      const mat1 = Mat.fromArray([[1, 2], [3, 4]]);
      const mat2 = Mat.fromArray([[5, 6], [7, 8]]);

      matVector.push_back(mat1);
      matVector.push_back(mat2);

      expect(matVector.size()).toBe(2);
      expect(matVector.empty()).toBe(false);

      const retrieved1 = matVector.get(0);
      const retrieved2 = matVector.get(1);

      expect(retrieved1.rows).toBe(2);
      expect(retrieved1.cols).toBe(2);
      expect(Array.from(retrieved1.tensor.data as Uint8Array)).toEqual([1, 2, 3, 4]);

      expect(retrieved2.rows).toBe(2);
      expect(retrieved2.cols).toBe(2);
      expect(Array.from(retrieved2.tensor.data as Uint8Array)).toEqual([5, 6, 7, 8]);
    });

    it("should handle different matrix types", () => {
      const matVector = new MatVector();
      const uint8Mat = Mat.fromArray([[1, 2], [3, 4]], undefined, "uint8");
      const floatMat = Mat.fromArray([[1.1, 2.2], [3.3, 4.4]], undefined, "float32");

      matVector.push_back(uint8Mat);
      matVector.push_back(floatMat);

      expect(matVector.size()).toBe(2);

      const retrieved1 = matVector.get(0);
      const retrieved2 = matVector.get(1);

      expect(retrieved1.tensor.type).toBe("uint8");
      expect(retrieved2.tensor.type).toBe("float32");
    });
  });

  describe("Vector Operations", () => {
    it("should clear all elements", () => {
      const matVector = new MatVector();
      const mat1 = Mat.fromArray([[1, 2], [3, 4]]);
      const mat2 = Mat.fromArray([[5, 6], [7, 8]]);

      matVector.push_back(mat1);
      matVector.push_back(mat2);

      expect(matVector.size()).toBe(2);

      matVector.clear();

      expect(matVector.size()).toBe(0);
      expect(matVector.empty()).toBe(true);
    });

    it("should resize vector", () => {
      const matVector = new MatVector();
      const mat = Mat.fromArray([[1, 2], [3, 4]]);

      matVector.push_back(mat);
      expect(matVector.size()).toBe(1);

      matVector.resize(3);
      expect(matVector.size()).toBe(3);

      // New elements should be empty matrices
      const newMat = matVector.get(1);
      expect(newMat.rows).toBe(0);
      expect(newMat.cols).toBe(0);
    });

    it("should set element at specific index", () => {
      const matVector = new MatVector();
      const mat1 = Mat.fromArray([[1, 2], [3, 4]]);
      const mat2 = Mat.fromArray([[5, 6], [7, 8]]);
      const mat3 = Mat.fromArray([[9, 10], [11, 12]]);

      matVector.push_back(mat1);
      matVector.push_back(mat2);

      matVector.set(1, mat3);

      const retrieved = matVector.get(1);
      expect(Array.from(retrieved.tensor.data as Uint8Array)).toEqual([9, 10, 11, 12]);
    });
  });

  describe("Error Handling", () => {
    it("should throw error for invalid index access", () => {
      const matVector = new MatVector();

      expect(() => matVector.get(0)).toThrow("Index out of bounds");
      expect(() => matVector.get(-1)).toThrow("Index out of bounds");
    });

    it("should throw error for invalid index set", () => {
      const matVector = new MatVector();
      const mat = Mat.fromArray([[1, 2], [3, 4]]);

      expect(() => matVector.set(0, mat)).toThrow("Index out of bounds");
      expect(() => matVector.set(-1, mat)).toThrow("Index out of bounds");
    });

    it("should handle negative resize", () => {
      const matVector = new MatVector();
      const mat = Mat.fromArray([[1, 2], [3, 4]]);
      matVector.push_back(mat);

      expect(() => matVector.resize(-1)).toThrow("Invalid size");
    });
  });

  describe("Iteration and Conversion", () => {
    it("should convert to array", () => {
      const matVector = new MatVector();
      const mat1 = Mat.fromArray([[1, 2], [3, 4]]);
      const mat2 = Mat.fromArray([[5, 6], [7, 8]]);

      matVector.push_back(mat1);
      matVector.push_back(mat2);

      const array = matVector.toArray();

      expect(array).toHaveLength(2);
      expect(array[0].rows).toBe(2);
      expect(array[0].cols).toBe(2);
      expect(array[1].rows).toBe(2);
      expect(array[1].cols).toBe(2);

      expect(Array.from(array[0].tensor.data as Uint8Array)).toEqual([1, 2, 3, 4]);
      expect(Array.from(array[1].tensor.data as Uint8Array)).toEqual([5, 6, 7, 8]);
    });

    it("should support forEach iteration", () => {
      const matVector = new MatVector();
      const mat1 = Mat.fromArray([[1, 2], [3, 4]]);
      const mat2 = Mat.fromArray([[5, 6], [7, 8]]);

      matVector.push_back(mat1);
      matVector.push_back(mat2);

      const results: number[][] = [];
      matVector.forEach((mat, index) => {
        results.push(Array.from(mat.tensor.data as Uint8Array));
      });

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual([1, 2, 3, 4]);
      expect(results[1]).toEqual([5, 6, 7, 8]);
    });
  });

  describe("Integration with OpenCV.js Style Operations", () => {
    it("should work with hconcat operation", async () => {
      const matVector = new MatVector();
      const mat1 = Mat.fromArray([[1, 2], [3, 4]]);
      const mat2 = Mat.fromArray([[5, 6], [7, 8]]);

      matVector.push_back(mat1);
      matVector.push_back(mat2);

      // Simulate hconcat operation
      const result = new Mat(new (await import("onnxruntime-web")).Tensor(
        "uint8",
        new Uint8Array([1, 2, 5, 6, 3, 4, 7, 8]),
        [2, 4]
      ));

      expect(result.rows).toBe(2);
      expect(result.cols).toBe(4);
      expect(Array.from(result.tensor.data as Uint8Array)).toEqual([1, 2, 5, 6, 3, 4, 7, 8]);
    });

    it("should work with vconcat operation", async () => {
      const matVector = new MatVector();
      const mat1 = Mat.fromArray([[1, 2], [3, 4]]);
      const mat2 = Mat.fromArray([[5, 6], [7, 8]]);

      matVector.push_back(mat1);
      matVector.push_back(mat2);

      // Simulate vconcat operation
      const result = new Mat(new (await import("onnxruntime-web")).Tensor(
        "uint8",
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
        [4, 2]
      ));

      expect(result.rows).toBe(4);
      expect(result.cols).toBe(2);
      expect(Array.from(result.tensor.data as Uint8Array)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });
  });
});
