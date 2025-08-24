import { describe, it, expect } from "vitest";
import { Mat, CV_8UC1, CV_8U, CV_32F } from "../src/index.js";

describe("Mat Static Methods with OpenCV.js Constants", () => {
  describe("Mat.zeros with OpenCV.js constants", () => {
    it("should create zeros matrix with CV_8UC1", () => {
      const mat = Mat.zeros(2, 3, CV_8UC1);
      
      expect(mat.rows).toBe(2);
      expect(mat.cols).toBe(3);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([2, 3]);
      expect(mat.tensor.type).toBe("uint8");
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it("should create zeros matrix with CV_8U", () => {
      const mat = Mat.zeros(3, 2, CV_8U);
      
      expect(mat.rows).toBe(3);
      expect(mat.cols).toBe(2);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([3, 2]);
      expect(mat.tensor.type).toBe("uint8");
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it("should create zeros matrix with CV_32F", () => {
      const mat = Mat.zeros(2, 2, CV_32F);
      
      expect(mat.rows).toBe(2);
      expect(mat.cols).toBe(2);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([2, 2]);
      expect(mat.tensor.type).toBe("float32");
      const data = Array.from(mat.tensor.data as Float32Array);
      expect(data[0]).toBe(0);
      expect(data[1]).toBe(0);
      expect(data[2]).toBe(0);
      expect(data[3]).toBe(0);
    });

    it("should maintain backward compatibility with DType", () => {
      const mat = Mat.zeros(2, 2, "uint8");
      
      expect(mat.rows).toBe(2);
      expect(mat.cols).toBe(2);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([2, 2]);
      expect(mat.tensor.type).toBe("uint8");
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([0, 0, 0, 0]);
    });
  });

  describe("Mat.ones with OpenCV.js constants", () => {
    it("should create ones matrix with CV_8UC1", () => {
      const mat = Mat.ones(2, 3, CV_8UC1);
      
      expect(mat.rows).toBe(2);
      expect(mat.cols).toBe(3);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([2, 3]);
      expect(mat.tensor.type).toBe("uint8");
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([1, 1, 1, 1, 1, 1]);
    });

    it("should create ones matrix with CV_8U", () => {
      const mat = Mat.ones(3, 2, CV_8U);
      
      expect(mat.rows).toBe(3);
      expect(mat.cols).toBe(2);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([3, 2]);
      expect(mat.tensor.type).toBe("uint8");
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([1, 1, 1, 1, 1, 1]);
    });

    it("should create ones matrix with CV_32F", () => {
      const mat = Mat.ones(2, 2, CV_32F);
      
      expect(mat.rows).toBe(2);
      expect(mat.cols).toBe(2);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([2, 2]);
      expect(mat.tensor.type).toBe("float32");
      const data = Array.from(mat.tensor.data as Float32Array);
      expect(data[0]).toBe(1);
      expect(data[1]).toBe(1);
      expect(data[2]).toBe(1);
      expect(data[3]).toBe(1);
    });

    it("should maintain backward compatibility with DType", () => {
      const mat = Mat.ones(2, 2, "uint8");
      
      expect(mat.rows).toBe(2);
      expect(mat.cols).toBe(2);
      expect(mat.channels).toBe(1);
      expect(mat.shape).toEqual([2, 2]);
      expect(mat.tensor.type).toBe("uint8");
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([1, 1, 1, 1]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle 1x1 matrices", () => {
      const zeros = Mat.zeros(1, 1, CV_8UC1);
      const ones = Mat.ones(1, 1, CV_8UC1);
      
      expect(zeros.rows).toBe(1);
      expect(zeros.cols).toBe(1);
      expect(Array.from(zeros.tensor.data as Uint8Array)).toEqual([0]);
      
      expect(ones.rows).toBe(1);
      expect(ones.cols).toBe(1);
      expect(Array.from(ones.tensor.data as Uint8Array)).toEqual([1]);
    });

    it("should handle large matrices", () => {
      const size = 100;
      const zeros = Mat.zeros(size, size, CV_8UC1);
      const ones = Mat.ones(size, size, CV_8UC1);
      
      expect(zeros.rows).toBe(size);
      expect(zeros.cols).toBe(size);
      expect(zeros.tensor.data.length).toBe(size * size);
      
      expect(ones.rows).toBe(size);
      expect(ones.cols).toBe(size);
      expect(ones.tensor.data.length).toBe(size * size);
    });
  });

  describe("Integration with Main Project Usage", () => {
    it("should work with mask.height, mask.width, CV_8UC1 pattern", () => {
      const height = 100;
      const width = 200;
      const refinedMask = Mat.zeros(height, width, CV_8UC1);
      
      expect(refinedMask.rows).toBe(height);
      expect(refinedMask.cols).toBe(width);
      expect(refinedMask.channels).toBe(1);
      expect(refinedMask.tensor.type).toBe("uint8");
    });

    it("should work with 3x3 kernel pattern", () => {
      const kernel = Mat.ones(3, 3, CV_8U);
      
      expect(kernel.rows).toBe(3);
      expect(kernel.cols).toBe(3);
      expect(kernel.channels).toBe(1);
      expect(kernel.tensor.type).toBe("uint8");
      expect(Array.from(kernel.tensor.data as Uint8Array)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    });
  });
});
