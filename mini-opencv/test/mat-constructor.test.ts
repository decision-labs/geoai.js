import { describe, it, expect } from "vitest";
import { Mat, CV_8UC1, CV_8UC3, CV_8UC4, CV_32F, Scalar, matFromArray, MatVector } from "../src/index.js";

describe("Mat Constructor with Dimensions", () => {
  describe("Basic Constructor", () => {
    it("should create matrix with rows and cols", () => {
      const mat = new Mat(3, 4, CV_8UC1);
      
      expect(mat.rows).toBe(3);
      expect(mat.cols).toBe(4);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([3, 4]);
      expect(mat.tensor.type).toBe("uint8");
    });

    it("should create matrix with rows, cols, and type", () => {
      const mat = new Mat(2, 3, CV_32F);
      
      expect(mat.rows).toBe(2);
      expect(mat.cols).toBe(3);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([2, 3]);
      expect(mat.tensor.type).toBe("float32");
    });

    it("should create multi-channel matrix", () => {
      const mat = new Mat(2, 2, CV_8UC3);
      
      expect(mat.rows).toBe(2);
      expect(mat.cols).toBe(2);
      expect(mat.channels).toBe(3);
      expect(mat.shape).toEqual([2, 2, 3]);
      expect(mat.tensor.type).toBe("uint8");
    });

    it("should create 4-channel matrix", () => {
      const mat = new Mat(1, 1, CV_8UC4);
      
      expect(mat.rows).toBe(1);
      expect(mat.cols).toBe(1);
      expect(mat.channels).toBe(4);
      expect(mat.shape).toEqual([1, 1, 4]);
      expect(mat.tensor.type).toBe("uint8");
    });
  });

  describe("Constructor with Scalar", () => {
    it("should create matrix filled with scalar value", () => {
      const mat = new Mat(2, 2, CV_8UC1, new Scalar(42));
      
      expect(mat.rows).toBe(2);
      expect(mat.cols).toBe(2);
      expect(mat.channels).toBe(1);
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([42, 42, 42, 42]);
    });

    it("should create matrix filled with RGB scalar", () => {
      const mat = new Mat(1, 2, CV_8UC3, new Scalar(255, 128, 64));
      
      expect(mat.rows).toBe(1);
      expect(mat.cols).toBe(2);
      expect(mat.channels).toBe(3);
      const data = Array.from(mat.tensor.data as Uint8Array);
      expect(data).toEqual([255, 128, 64, 255, 128, 64]);
    });

    it("should create matrix filled with RGBA scalar", () => {
      const mat = new Mat(1, 1, CV_8UC4, new Scalar(255, 128, 64, 32));
      
      expect(mat.rows).toBe(1);
      expect(mat.cols).toBe(1);
      expect(mat.channels).toBe(4);
      const data = Array.from(mat.tensor.data as Uint8Array);
      expect(data).toEqual([255, 128, 64, 32]);
    });

    it("should create float matrix filled with scalar", () => {
      const mat = new Mat(2, 1, CV_32F, new Scalar(3.14));
      
      expect(mat.rows).toBe(2);
      expect(mat.cols).toBe(1);
      expect(mat.channels).toBe(1);
      expect(mat.tensor.type).toBe("float32");
      const data = Array.from(mat.tensor.data as Float32Array);
      expect(data[0]).toBeCloseTo(3.14);
      expect(data[1]).toBeCloseTo(3.14);
    });
  });

  describe("Edge Cases", () => {
    it("should create 1x1 matrix", () => {
      const mat = new Mat(1, 1, CV_8UC1);
      
      expect(mat.rows).toBe(1);
      expect(mat.cols).toBe(1);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([1, 1]);
    });

    it("should create single row matrix", () => {
      const mat = new Mat(1, 5, CV_8UC1);
      
      expect(mat.rows).toBe(1);
      expect(mat.cols).toBe(5);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([1, 5]);
    });

    it("should create single column matrix", () => {
      const mat = new Mat(5, 1, CV_8UC1);
      
      expect(mat.rows).toBe(5);
      expect(mat.cols).toBe(1);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([5, 1]);
    });

    it("should create large matrix", () => {
      const mat = new Mat(100, 100, CV_8UC1);
      
      expect(mat.rows).toBe(100);
      expect(mat.cols).toBe(100);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([100, 100]);
      expect(mat.tensor.data.length).toBe(10000);
    });
  });

  describe("Data Initialization", () => {
    it("should initialize with zeros when no scalar provided", () => {
      const mat = new Mat(2, 2, CV_8UC1);
      
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([0, 0, 0, 0]);
    });

    it("should initialize float matrix with zeros", () => {
      const mat = new Mat(2, 2, CV_32F);
      
      const data = Array.from(mat.tensor.data as Float32Array);
      expect(data[0]).toBe(0);
      expect(data[1]).toBe(0);
      expect(data[2]).toBe(0);
      expect(data[3]).toBe(0);
    });

    it("should initialize multi-channel matrix with zeros", () => {
      const mat = new Mat(1, 2, CV_8UC3);
      
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([0, 0, 0, 0, 0, 0]);
    });
  });

  describe("Error Handling", () => {
    it("should throw error for negative rows", () => {
      expect(() => new Mat(-1, 2, CV_8UC1)).toThrow("Invalid dimensions");
    });

    it("should throw error for negative cols", () => {
      expect(() => new Mat(2, -1, CV_8UC1)).toThrow("Invalid dimensions");
    });

    it("should throw error for zero rows", () => {
      expect(() => new Mat(0, 2, CV_8UC1)).toThrow("Invalid dimensions");
    });

    it("should throw error for zero cols", () => {
      expect(() => new Mat(2, 0, CV_8UC1)).toThrow("Invalid dimensions");
    });

    it("should throw error for invalid type", () => {
      expect(() => new Mat(2, 2, "invalid" as any)).toThrow("Unsupported data type");
    });
  });

  describe("Integration with Existing Methods", () => {
    it("should work with matFromArray", () => {
      const data = [1, 2, 3, 4, 5, 6];
      const mat1 = matFromArray(2, 3, CV_8UC1, data);
      const mat2 = new Mat(2, 3, CV_8UC1);
      
      expect(mat1.rows).toBe(mat2.rows);
      expect(mat1.cols).toBe(mat2.cols);
      expect(mat1.channels).toBe(mat2.channels);
      expect(mat1.shape).toEqual(mat2.shape);
    });

    it("should work with MatVector", () => {
      const matVector = new MatVector();
      const mat1 = new Mat(2, 2, CV_8UC1);
      const mat2 = new Mat(2, 2, CV_8UC1, new Scalar(255));
      
      matVector.push_back(mat1);
      matVector.push_back(mat2);
      
      expect(matVector.size()).toBe(2);
      expect(matVector.get(0).rows).toBe(2);
      expect(matVector.get(1).rows).toBe(2);
    });
  });
});
