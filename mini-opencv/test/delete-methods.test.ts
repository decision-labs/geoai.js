import { describe, it, expect } from "vitest";
import { Mat, MatVector, matFromArray } from "../src/index.js";

describe("Delete Methods", () => {
  describe("Mat.delete()", () => {
    it("should have delete method on Mat instances", () => {
      const mat = new Mat(2, 2, "float32");
      
      expect(typeof mat.delete).toBe("function");
    });

    it("should call delete method without errors", () => {
      const mat = new Mat(2, 2, "float32");
      
      expect(() => mat.delete()).not.toThrow();
    });

    it("should work with empty matrix", () => {
      const mat = new Mat();
      
      expect(() => mat.delete()).not.toThrow();
    });

    it("should work with matrix created from tensor", async () => {
      const mat = new Mat(new (await import("onnxruntime-web")).Tensor("uint8", new Uint8Array([1, 2, 3, 4]), [2, 2]));
      
      expect(() => mat.delete()).not.toThrow();
    });

    it("should work with matrix created from array", () => {
      const mat = Mat.fromArray([1, 2, 3, 4], [2, 2], "float32");
      
      expect(() => mat.delete()).not.toThrow();
    });

    it("should work with matrix created from matFromArray", () => {
      const mat = matFromArray(2, 2, "float32", [1, 2, 3, 4]);
      
      expect(() => mat.delete()).not.toThrow();
    });
  });

  describe("MatVector.delete()", () => {
    it("should have delete method on MatVector instances", () => {
      const matVector = new MatVector();
      
      expect(typeof matVector.delete).toBe("function");
    });

    it("should call delete method without errors on empty MatVector", () => {
      const matVector = new MatVector();
      
      expect(() => matVector.delete()).not.toThrow();
    });

    it("should call delete method without errors on populated MatVector", () => {
      const matVector = new MatVector();
      matVector.push_back(new Mat(2, 2, "float32"));
      matVector.push_back(new Mat(3, 3, "float32"));
      
      expect(() => matVector.delete()).not.toThrow();
    });

    it("should work with MatVector containing different matrix types", () => {
      const matVector = new MatVector();
      matVector.push_back(new Mat(2, 2, "float32"));
      matVector.push_back(new Mat(2, 2, "float32"));
      matVector.push_back(new Mat());
      
      expect(() => matVector.delete()).not.toThrow();
    });

    it("should work with MatVector created with initial capacity", () => {
      const matVector = new MatVector(10);
      matVector.push_back(new Mat(2, 2, "float32"));
      
      expect(() => matVector.delete()).not.toThrow();
    });
  });

  describe("Integration with Existing Operations", () => {
    it("should allow delete after matrix operations", () => {
      const mat1 = new Mat(2, 2, "float32");
      const mat2 = new Mat(2, 2, "float32");
      
      mat1.copyTo(mat2);
      
      expect(() => mat1.delete()).not.toThrow();
      expect(() => mat2.delete()).not.toThrow();
    });

    it("should allow delete after MatVector operations", () => {
      const matVector = new MatVector();
      const mat = new Mat(2, 2, "float32");
      
      matVector.push_back(mat);
      matVector.push_back(mat);
      
      expect(() => matVector.delete()).not.toThrow();
      expect(() => mat.delete()).not.toThrow();
    });

    it("should allow delete after ROI operations", () => {
      const mat = new Mat(4, 4, "float32");
      const roi = mat.roi({ x: 1, y: 1, width: 2, height: 2 });
      
      expect(() => mat.delete()).not.toThrow();
      expect(() => roi.delete()).not.toThrow();
    });
  });

  describe("Multiple Delete Calls", () => {
    it("should handle multiple delete calls on Mat gracefully", () => {
      const mat = new Mat(2, 2, "float32");
      
      expect(() => mat.delete()).not.toThrow();
      expect(() => mat.delete()).not.toThrow(); // Second call should not throw
    });

    it("should handle multiple delete calls on MatVector gracefully", () => {
      const matVector = new MatVector();
      matVector.push_back(new Mat(2, 2, "float32"));
      
      expect(() => matVector.delete()).not.toThrow();
      expect(() => matVector.delete()).not.toThrow(); // Second call should not throw
    });
  });
});
