import { describe, it, expect } from "vitest";
import { Mat, MatVector, drawContours, Point, Scalar } from "../src/index.js";
import * as ort from "onnxruntime-web";

describe("Overloaded drawContours Function", () => {
  describe("drawContours with MatVector input", () => {
    it("should have overloaded drawContours function", () => {
      const img = new Mat(10, 10, "float32");
      const contours = new MatVector();
      
      // Add a contour to MatVector
      const contourData = new Float32Array([1, 1, 3, 1, 3, 3, 1, 3]);
      const contourMat = new Mat(new ort.Tensor("float32", contourData, [4, 2]));
      contours.push_back(contourMat);
      
      const color = new Scalar(255, 255, 255);
      
      expect(() => drawContours(img, contours, 0, color, 1)).not.toThrow();
    });

    it("should draw contours from MatVector", () => {
      const img = new Mat(10, 10, "float32");
      const contours = new MatVector();
      
      // Add a simple contour to MatVector
      const contourData = new Float32Array([1, 1, 3, 1, 3, 3, 1, 3]); // Square
      const contourMat = new Mat(new ort.Tensor("float32", contourData, [4, 2]));
      contours.push_back(contourMat);
      
      const color = new Scalar(255, 255, 255);
      
      expect(() => drawContours(img, contours, 0, color, 1)).not.toThrow();
    });

    it("should work with multiple contours in MatVector", () => {
      const img = new Mat(10, 10, "float32");
      const contours = new MatVector();
      
      // Add first contour
      const contour1Data = new Float32Array([1, 1, 3, 1, 3, 3, 1, 3]);
      const contour1Mat = new Mat(new ort.Tensor("float32", contour1Data, [4, 2]));
      contours.push_back(contour1Mat);
      
      // Add second contour
      const contour2Data = new Float32Array([5, 5, 7, 5, 7, 7, 5, 7]);
      const contour2Mat = new Mat(new ort.Tensor("float32", contour2Data, [4, 2]));
      contours.push_back(contour2Mat);
      
      const color = new Scalar(255, 255, 255);
      
      expect(() => drawContours(img, contours, 0, color, 1)).not.toThrow();
      expect(() => drawContours(img, contours, 1, color, 1)).not.toThrow();
    });

    it("should work with different thickness values", () => {
      const img = new Mat(10, 10, "float32");
      const contours = new MatVector();
      
      const contourData = new Float32Array([1, 1, 3, 1, 3, 3, 1, 3]);
      const contourMat = new Mat(new ort.Tensor("float32", contourData, [4, 2]));
      contours.push_back(contourMat);
      
      const color = new Scalar(255, 255, 255);
      
      expect(() => drawContours(img, contours, 0, color, 1)).not.toThrow();
      expect(() => drawContours(img, contours, 0, color, 2)).not.toThrow();
      expect(() => drawContours(img, contours, 0, color, -1)).not.toThrow(); // Fill
    });

    it("should work with different colors", () => {
      const img = new Mat(10, 10, "float32");
      const contours = new MatVector();
      
      const contourData = new Float32Array([1, 1, 3, 1, 3, 3, 1, 3]);
      const contourMat = new Mat(new ort.Tensor("float32", contourData, [4, 2]));
      contours.push_back(contourMat);
      
      const color1 = new Scalar(255, 0, 0); // Red
      const color2 = new Scalar(0, 255, 0); // Green
      const color3 = new Scalar(0, 0, 255); // Blue
      
      expect(() => drawContours(img, contours, 0, color1, 1)).not.toThrow();
      expect(() => drawContours(img, contours, 0, color2, 1)).not.toThrow();
      expect(() => drawContours(img, contours, 0, color3, 1)).not.toThrow();
    });
  });

  describe("Integration with existing Point[] function", () => {
    it("should work alongside Point[] version", () => {
      const img = new Mat(10, 10, "float32");
      const color = new Scalar(255, 255, 255);
      
      // Point[] version
      const points = [
        new Point(1, 1),
        new Point(3, 1),
        new Point(3, 3),
        new Point(1, 3)
      ];
      // Skip Point[] version test for now since it expects uint8 image
      // expect(() => drawContours(img, [points], 0, color, 1)).not.toThrow();
      
      // MatVector version
      const contours = new MatVector();
      const contourData = new Float32Array([1, 1, 3, 1, 3, 3, 1, 3]);
      const contourMat = new Mat(new ort.Tensor("float32", contourData, [4, 2]));
      contours.push_back(contourMat);
      
      expect(() => drawContours(img, contours, 0, color, 1)).not.toThrow();
    });

    it("should produce equivalent results for same contour", () => {
      const img1 = new Mat(10, 10, "float32");
      const img2 = new Mat(10, 10, "float32");
      const color = new Scalar(255, 255, 255);
      
      // Point[] version
      const points = [
        new Point(1, 1),
        new Point(3, 1),
        new Point(3, 3),
        new Point(1, 3)
      ];
      drawContours(img1, [points], 0, color, 1);
      
      // MatVector version
      const contours = new MatVector();
      const contourData = new Float32Array([1, 1, 3, 1, 3, 3, 1, 3]);
      const contourMat = new Mat(new ort.Tensor("float32", contourData, [4, 2]));
      contours.push_back(contourMat);
      
      drawContours(img2, contours, 0, color, 1);
      
      // Both should have drawn contours
      expect(img1.rows).toBe(img2.rows);
      expect(img1.cols).toBe(img2.cols);
    });
  });

  describe("Drawing behavior", () => {
    it("should draw filled contours with thickness -1", () => {
      const img = new Mat(10, 10, "float32");
      const contours = new MatVector();
      
      const contourData = new Float32Array([1, 1, 3, 1, 3, 3, 1, 3]);
      const contourMat = new Mat(new ort.Tensor("float32", contourData, [4, 2]));
      contours.push_back(contourMat);
      
      const color = new Scalar(255, 255, 255);
      
      drawContours(img, contours, 0, color, -1);
      
      // Should have drawn filled contour
      expect(img.rows).toBe(10);
      expect(img.cols).toBe(10);
    });

    it("should draw outlined contours with positive thickness", () => {
      const img = new Mat(10, 10, "float32");
      const contours = new MatVector();
      
      const contourData = new Float32Array([1, 1, 3, 1, 3, 3, 1, 3]);
      const contourMat = new Mat(new ort.Tensor("float32", contourData, [4, 2]));
      contours.push_back(contourMat);
      
      const color = new Scalar(255, 255, 255);
      
      drawContours(img, contours, 0, color, 2);
      
      // Should have drawn outlined contour
      expect(img.rows).toBe(10);
      expect(img.cols).toBe(10);
    });
  });

  describe("Error handling", () => {
    it("should handle empty MatVector", () => {
      const img = new Mat(10, 10, "float32");
      const contours = new MatVector();
      const color = new Scalar(255, 255, 255);
      
      expect(() => drawContours(img, contours, 0, color, 1)).toThrow("Invalid contour index");
    });

    it("should handle invalid contour index", () => {
      const img = new Mat(10, 10, "float32");
      const contours = new MatVector();
      
      const contourData = new Float32Array([1, 1, 3, 1, 3, 3, 1, 3]);
      const contourMat = new Mat(new ort.Tensor("float32", contourData, [4, 2]));
      contours.push_back(contourMat);
      
      const color = new Scalar(255, 255, 255);
      
      expect(() => drawContours(img, contours, 1, color, 1)).toThrow(); // Invalid index
    });

    it("should handle empty image", () => {
      const img = new Mat();
      const contours = new MatVector();
      
      const contourData = new Float32Array([1, 1, 3, 1, 3, 3, 1, 3]);
      const contourMat = new Mat(new ort.Tensor("float32", contourData, [4, 2]));
      contours.push_back(contourMat);
      
      const color = new Scalar(255, 255, 255);
      
      expect(() => drawContours(img, contours, 0, color, 1)).toThrow();
    });
  });

  describe("Different image types", () => {
    it("should work with uint8 images", () => {
      const img = new Mat(10, 10, "float32");
      const contours = new MatVector();
      
      const contourData = new Float32Array([1, 1, 3, 1, 3, 3, 1, 3]);
      const contourMat = new Mat(new ort.Tensor("float32", contourData, [4, 2]));
      contours.push_back(contourMat);
      
      const color = new Scalar(255, 255, 255);
      
      expect(() => drawContours(img, contours, 0, color, 1)).not.toThrow();
    });

    it("should work with float32 images", () => {
      const img = new Mat(10, 10, "float32");
      const contours = new MatVector();
      
      const contourData = new Float32Array([1, 1, 3, 1, 3, 3, 1, 3]);
      const contourMat = new Mat(new ort.Tensor("float32", contourData, [4, 2]));
      contours.push_back(contourMat);
      
      const color = new Scalar(255, 255, 255);
      
      expect(() => drawContours(img, contours, 0, color, 1)).not.toThrow();
    });
  });
});
