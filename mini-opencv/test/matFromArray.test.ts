import { describe, it, expect } from "vitest";
import { matFromArray, CV_8UC1, CV_8UC3, CV_8UC4, CV_32F } from "../src/index.js";

describe("matFromArray", () => {
  describe("2D arrays", () => {
    it("should create matrix from 2D array with uint8 data", () => {
      const data = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];
      
      const mat = matFromArray(3, 3, CV_8UC1, data.flat());
      
      expect(mat.rows).toBe(3);
      expect(mat.cols).toBe(3);
      expect(mat.channels).toBe(1);
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("should create matrix from 2D array with float32 data", () => {
      const data = [
        [1.1, 2.2, 3.3],
        [4.4, 5.5, 6.6]
      ];
      
      const mat = matFromArray(2, 3, CV_32F, data.flat());
      
      expect(mat.rows).toBe(2);
      expect(mat.cols).toBe(3);
      expect(mat.channels).toBe(1);
      const result = Array.from(mat.tensor.data as Float32Array);
      expect(result).toHaveLength(6);
      expect(result[0]).toBeCloseTo(1.1);
      expect(result[1]).toBeCloseTo(2.2);
      expect(result[2]).toBeCloseTo(3.3);
      expect(result[3]).toBeCloseTo(4.4);
      expect(result[4]).toBeCloseTo(5.5);
      expect(result[5]).toBeCloseTo(6.6);
    });

    it("should handle single row matrix", () => {
      const data = [1, 2, 3, 4, 5];
      const mat = matFromArray(1, 5, CV_8UC1, data);
      
      expect(mat.rows).toBe(1);
      expect(mat.cols).toBe(5);
      expect(mat.channels).toBe(1);
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([1, 2, 3, 4, 5]);
    });

    it("should handle single column matrix", () => {
      const data = [1, 2, 3, 4];
      const mat = matFromArray(4, 1, CV_8UC1, data);
      
      expect(mat.rows).toBe(4);
      expect(mat.cols).toBe(1);
      expect(mat.channels).toBe(1);
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([1, 2, 3, 4]);
    });
  });

  describe("3D arrays (multi-channel)", () => {
    it("should create 3-channel matrix from flat array", () => {
      // RGB data: 2x2 image with 3 channels
      const data = [
        255, 0, 0,     // Red pixel
        0, 255, 0,     // Green pixel
        0, 0, 255,     // Blue pixel
        255, 255, 255  // White pixel
      ];
      
      const mat = matFromArray(2, 2, CV_8UC3, data);
      
      expect(mat.rows).toBe(2);
      expect(mat.cols).toBe(2);
      expect(mat.channels).toBe(3);
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual(data);
    });

    it("should create 4-channel matrix from flat array", () => {
      // RGBA data: 1x2 image with 4 channels
      const data = [
        255, 0, 0, 255,     // Red pixel with full alpha
        0, 255, 0, 128      // Green pixel with half alpha
      ];
      
      const mat = matFromArray(1, 2, CV_8UC4, data);
      
      expect(mat.rows).toBe(1);
      expect(mat.cols).toBe(2);
      expect(mat.channels).toBe(4);
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual(data);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty matrix", () => {
      const mat = matFromArray(0, 0, CV_8UC1, []);
      
      expect(mat.rows).toBe(0);
      expect(mat.cols).toBe(0);
      expect(mat.channels).toBe(1);
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([]);
    });

    it("should handle 1x1 matrix", () => {
      const mat = matFromArray(1, 1, CV_8UC1, [42]);
      
      expect(mat.rows).toBe(1);
      expect(mat.cols).toBe(1);
      expect(mat.channels).toBe(1);
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([42]);
    });

    it("should handle large matrix", () => {
      const size = 100;
      const data = new Array(size * size).fill(1);
      const mat = matFromArray(size, size, CV_8UC1, data);
      
      expect(mat.rows).toBe(size);
      expect(mat.cols).toBe(size);
      expect(mat.channels).toBe(1);
      expect(mat.tensor.data.length).toBe(size * size);
    });
  });

  describe("Data type handling", () => {
    it("should handle uint8 data correctly", () => {
      const data = [0, 128, 255];
      const mat = matFromArray(1, 3, CV_8UC1, data);
      
      expect(mat.tensor.type).toBe("uint8");
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([0, 128, 255]);
    });

    it("should handle float32 data correctly", () => {
      const data = [0.0, 0.5, 1.0];
      const mat = matFromArray(1, 3, CV_32F, data);
      
      expect(mat.tensor.type).toBe("float32");
      const result = Array.from(mat.tensor.data as Float32Array);
      expect(result).toHaveLength(3);
      expect(result[0]).toBeCloseTo(0.0);
      expect(result[1]).toBeCloseTo(0.5);
      expect(result[2]).toBeCloseTo(1.0);
    });
  });

  describe("Error handling", () => {
    it("should throw error for mismatched data size", () => {
      const data = [1, 2, 3]; // 3 elements
      
      expect(() => matFromArray(2, 2, CV_8UC1, data)).toThrow("Data size mismatch");
    });

    it("should throw error for negative dimensions", () => {
      const data = [1, 2, 3, 4];
      
      expect(() => matFromArray(-1, 2, CV_8UC1, data)).toThrow("Invalid dimensions");
      expect(() => matFromArray(2, -1, CV_8UC1, data)).toThrow("Invalid dimensions");
    });

    it("should throw error for invalid data type", () => {
      const data = [1, 2, 3, 4];
      
      expect(() => matFromArray(2, 2, "invalid" as any, data)).toThrow("Unsupported data type");
    });
  });
});
