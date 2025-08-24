import { describe, it, expect } from "vitest";
import { 
  Mat, 
  cvtColor, 
  COLOR_RGB2GRAY, 
  COLOR_BGR2RGB, 
  Scalar, 
  getStructuringElement, 
  MORPH_RECT, 
  Size 
} from "../src/index.js";

describe("Mini-OpenCV Validation Tests", () => {
  describe("cvtColor - RGB to Grayscale", () => {
    it("should convert RGB to grayscale with correct coefficients", async () => {
      // Test data: RGB values that should produce specific grayscale results
      // Formula: 0.299*R + 0.587*G + 0.114*B
      const testData = new Uint8Array([
        255, 0, 0,    // Red: 0.299*255 = 76.245 ≈ 76
        0, 255, 0,    // Green: 0.587*255 = 149.685 ≈ 150
        0, 0, 255,    // Blue: 0.114*255 = 29.07 ≈ 29
        255, 255, 255 // White: 0.299*255 + 0.587*255 + 0.114*255 = 255
      ]);

      const miniMat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", testData, [2, 2, 3]));
      const miniGray = cvtColor(miniMat, COLOR_RGB2GRAY);
      const result = Array.from(miniGray.tensor.data as Uint8Array);

      // Expected results based on OpenCV's RGB to GRAY conversion formula
      expect(result).toEqual([76, 150, 29, 255]);
    });

    it("should handle edge cases correctly", async () => {
      // Test with all zeros
      const zeroData = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const miniMat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", zeroData, [2, 2, 3]));
      const miniGray = cvtColor(miniMat, COLOR_RGB2GRAY);
      const result = Array.from(miniGray.tensor.data as Uint8Array);

      expect(result).toEqual([0, 0, 0, 0]);
    });

    it("should handle maximum values correctly", async () => {
      // Test with all 255s
      const maxData = new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]);
      const miniMat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", maxData, [2, 2, 3]));
      const miniGray = cvtColor(miniMat, COLOR_RGB2GRAY);
      const result = Array.from(miniGray.tensor.data as Uint8Array);

      expect(result).toEqual([255, 255, 255, 255]);
    });

    it("should handle mixed values correctly", async () => {
      // Test with mixed RGB values
      const mixedData = new Uint8Array([
        128, 64, 32,   // R=128, G=64, B=32: 0.299*128 + 0.587*64 + 0.114*32 = 38.272 + 37.568 + 3.648 = 79.488 ≈ 79
        64, 128, 32,   // R=64, G=128, B=32: 0.299*64 + 0.587*128 + 0.114*32 = 19.136 + 75.136 + 3.648 = 97.92 ≈ 98
        32, 64, 128    // R=32, G=64, B=128: 0.299*32 + 0.587*64 + 0.114*128 = 9.568 + 37.568 + 14.592 = 61.728 ≈ 62
      ]);

      const miniMat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", mixedData, [1, 3, 3]));
      const miniGray = cvtColor(miniMat, COLOR_RGB2GRAY);
      const result = Array.from(miniGray.tensor.data as Uint8Array);

      expect(result).toEqual([79, 98, 62]);
    });
  });

  describe("cvtColor - BGR to RGB", () => {
    it("should convert BGR to RGB correctly", async () => {
      // Test data: BGR values
      const testData = new Uint8Array([
        0, 0, 255,     // BGR: Blue should become RGB: Red
        0, 255, 0,     // BGR: Green should stay Green
        255, 0, 0,     // BGR: Red should become RGB: Blue
        255, 255, 255  // BGR: White should stay White
      ]);

      const miniMat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", testData, [2, 2, 3]));
      const miniRGB = cvtColor(miniMat, COLOR_BGR2RGB);
      const result = Array.from(miniRGB.tensor.data as Uint8Array);

      // Expected: BGR -> RGB conversion
      expect(result).toEqual([
        255, 0, 0,     // Blue -> Red
        0, 255, 0,     // Green -> Green
        0, 0, 255,     // Red -> Blue
        255, 255, 255  // White -> White
      ]);
    });
  });

  describe("Matrix Properties", () => {
    it("should have correct matrix properties", async () => {
      const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const miniMat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", testData, [2, 2, 3]));

      expect(miniMat.rows).toBe(2);
      expect(miniMat.cols).toBe(2);
      expect(miniMat.channels).toBe(3);
      expect(miniMat.shape).toEqual([2, 2, 3]);
    });

    it("should handle single channel matrices", async () => {
      const testData = new Uint8Array([1, 2, 3, 4]);
      const miniMat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", testData, [2, 2]));

      expect(miniMat.rows).toBe(2);
      expect(miniMat.cols).toBe(2);
      expect(miniMat.channels).toBe(1);
      expect(miniMat.shape).toEqual([2, 2]);
    });
  });

  describe("Matrix Factory Methods", () => {
    it("should create zeros matrix correctly", async () => {
      const zeros = Mat.zeros(3, 3, "uint8");
      
      expect(zeros.rows).toBe(3);
      expect(zeros.cols).toBe(3);
      expect(zeros.channels).toBe(1);
      expect(Array.from(zeros.tensor.data as Uint8Array)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it("should create ones matrix correctly", async () => {
      const ones = Mat.ones(2, 2, "float32");
      
      expect(ones.rows).toBe(2);
      expect(ones.cols).toBe(2);
      expect(ones.channels).toBe(1);
      expect(Array.from(ones.tensor.data as Float32Array)).toEqual([1, 1, 1, 1]);
    });

    it("should create matrix from array correctly", async () => {
      const arrayData = [[1, 2], [3, 4]];
      const mat = Mat.fromArray(arrayData, undefined, "uint8");
      
      expect(mat.rows).toBe(2);
      expect(mat.cols).toBe(2);
      expect(mat.channels).toBe(1);
      expect(Array.from(mat.tensor.data as Uint8Array)).toEqual([1, 2, 3, 4]);
    });
  });

  describe("Matrix Access Methods", () => {
    it("should get and set values correctly", async () => {
      const mat = Mat.fromArray([[1, 2], [3, 4]], undefined, "uint8");
      
      expect(mat.get(0, 0)).toBe(1);
      expect(mat.get(0, 1)).toBe(2);
      expect(mat.get(1, 0)).toBe(3);
      expect(mat.get(1, 1)).toBe(4);
      
      mat.set(0, 0, 10);
      mat.set(1, 1, 20);
      
      expect(mat.get(0, 0)).toBe(10);
      expect(mat.get(1, 1)).toBe(20);
    });

    it("should provide row pointers correctly", async () => {
      const mat = Mat.fromArray([[1, 2], [3, 4]], undefined, "float32");
      
      const row0 = mat.floatPtr(0);
      const row1 = mat.floatPtr(1);
      
      expect(Array.from(row0)).toEqual([1, 2]);
      expect(Array.from(row1)).toEqual([3, 4]);
    });

    it("should provide uchar pointers for uint8 matrices", async () => {
      const mat = Mat.fromArray([[1, 2], [3, 4]], undefined, "uint8");
      
      const row0 = mat.ucharPtr(0);
      const row1 = mat.ucharPtr(1);
      
      expect(Array.from(row0)).toEqual([1, 2]);
      expect(Array.from(row1)).toEqual([3, 4]);
    });

    it("should convert to nested array correctly", async () => {
      const mat = Mat.fromArray([[1, 2], [3, 4]], undefined, "uint8");
      const array = mat.toArray();
      
      expect(array).toEqual([[1, 2], [3, 4]]);
    });

    it("should provide raw data access", async () => {
      const mat = Mat.fromArray([[1, 2], [3, 4]], undefined, "uint8");
      const data = mat.data;
      
      expect(Array.from(data as Uint8Array)).toEqual([1, 2, 3, 4]);
    });
  });

  describe("Scalar Class", () => {
    it("should create scalar with correct values", () => {
      const scalar = new Scalar(255, 128, 64, 32);
      
      expect(scalar.values).toEqual([255, 128, 64, 32]);
    });

    it("should create scalar with default values", () => {
      const scalar = new Scalar(100);
      
      expect(scalar.values).toEqual([100, 0, 0, 0]);
    });

    it("should convert to tensor correctly", async () => {
      const scalar = new Scalar(255, 128, 64, 32);
      const tensor = scalar.toTensor("float32");
      
      expect(tensor.dims).toEqual([4]);
      expect(Array.from(tensor.data as Float32Array)).toEqual([255, 128, 64, 32]);
    });

    it("should convert to uint8 tensor correctly", async () => {
      const scalar = new Scalar(255, 128, 64, 32);
      const tensor = scalar.toTensor("uint8");
      
      expect(tensor.dims).toEqual([4]);
      expect(Array.from(tensor.data as Uint8Array)).toEqual([255, 128, 64, 32]);
    });
  });

  describe("getStructuringElement", () => {
    it("should create rectangular structuring element", async () => {
      const kernel = getStructuringElement(MORPH_RECT, new Size(3, 3));
      
      expect(kernel.rows).toBe(3);
      expect(kernel.cols).toBe(3);
      expect(kernel.channels).toBe(1);
      expect(Array.from(kernel.tensor.data as Uint8Array)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    });

    it("should create different sized kernels", async () => {
      const kernel = getStructuringElement(MORPH_RECT, new Size(2, 2));
      
      expect(kernel.rows).toBe(2);
      expect(kernel.cols).toBe(2);
      expect(kernel.channels).toBe(1);
      expect(Array.from(kernel.tensor.data as Uint8Array)).toEqual([1, 1, 1, 1]);
    });
  });

  describe("Error Handling", () => {
    it("should throw error for inconsistent row lengths", () => {
      const invalidData = [[1, 2], [3]]; // Inconsistent lengths
      
      expect(() => Mat.fromArray(invalidData)).toThrow("Inconsistent row lengths");
    });

    it("should throw error for missing dims in flat array", () => {
      const flatData = [1, 2, 3, 4];
      
      expect(() => Mat.fromArray(flatData)).toThrow("dims required for flat array");
    });

    it("should throw error for get/set on 1D tensor", async () => {
      const mat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", new Uint8Array([1, 2, 3, 4]), [4]));
      
      expect(() => mat.get(0, 0)).toThrow("get(y,x) needs 2D+ tensor");
      expect(() => mat.set(0, 0, 5)).toThrow("set(y,x) needs 2D+ tensor");
    });

    it("should throw error for floatPtr on non-float32 tensor", () => {
      const mat = Mat.fromArray([[1, 2], [3, 4]], undefined, "uint8");
      
      expect(() => mat.floatPtr(0)).toThrow("floatPtr requires float32");
    });

    it("should throw error for ucharPtr on non-uint8 tensor", () => {
      const mat = Mat.fromArray([[1, 2], [3, 4]], undefined, "float32");
      
      expect(() => mat.ucharPtr(0)).toThrow("ucharPtr requires uint8");
    });

    it("should throw error for toArray on non-2D tensor", async () => {
      const mat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", new Uint8Array([1, 2, 3, 4]), [2, 2, 1]));
      
      expect(() => mat.toArray()).toThrow("toArray supports 2D");
    });

    it("should throw error for shape mismatch in copyTo", () => {
      const mat1 = Mat.fromArray([[1, 2], [3, 4]]);
      const mat2 = Mat.fromArray([[1, 2, 3], [4, 5, 6]]);
      
      expect(() => mat1.copyTo(mat2)).toThrow("shape mismatch");
    });
  });
});
