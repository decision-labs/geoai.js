import { describe, it, expect } from "vitest";
import {
  Mat, Size, Scalar, Point, Rect,
  COLOR_RGB2GRAY, COLOR_BGR2RGB,
  INTER_NEAREST, INTER_LINEAR,
  BORDER_CONSTANT, THRESH_BINARY,
  MORPH_RECT, MORPH_CLOSE, FILLED,
  cvtColor, resize, copyMakeBorder, threshold,
  getStructuringElement, morphologyEx,
  hconcat, vconcat, findContours, contourArea, arcLength, approxPolyDP, drawContours
} from "../src/index.js";

/** Tiny helpers */
async function rgbMat(w:number,h:number, fill:[number,number,number]) {
  const data = new Uint8Array(w*h*3);
  for (let i=0;i<w*h;i++){ data[i*3]=fill[0]; data[i*3+1]=fill[1]; data[i*3+2]=fill[2]; }
  const ort = await import("onnxruntime-web");
  return new Mat(new ort.Tensor("uint8", data, [h,w,3]));
}

describe("Color & Resize & Border & Threshold", () => {
  it("RGB2GRAY", async () => {
    const w=2,h=1;
    const ort = await import("onnxruntime-web");
    const src = new Mat(new ort.Tensor(
      "uint8", new Uint8Array([255,0,0, 0,255,0]), [h,w,3]
    ));
    const gray = cvtColor(src, COLOR_RGB2GRAY);
    expect(gray.tensor.dims).toEqual([1,2]);
    expect(Array.from(gray.tensor.data as Uint8Array).map(n=>Math.round(n))).toEqual([76,150]);
  });

  it("BGR2RGB", async () => {
    const ort = await import("onnxruntime-web");
    const src = new Mat(new ort.Tensor(
      "uint8", new Uint8Array([10,20,30, 50,60,70]), [1,2,3]
    ));
    const rgb = cvtColor(src, COLOR_BGR2RGB);
    expect(Array.from(rgb.tensor.data as Uint8Array)).toEqual([30,20,10, 70,60,50]);
  });

  it("resize nearest & bilinear", async () => {
    const ort = await import("onnxruntime-web");
    const src = new Mat(new ort.Tensor(
      "uint8", new Uint8Array([0, 100, 200, 255]), [2,2]
    ));
    const nn = resize(src, new Size(4,4), INTER_NEAREST);
    const bl = resize(src, new Size(4,4), INTER_LINEAR);
    expect(nn.tensor.dims).toEqual([4,4]);
    expect(bl.tensor.dims).toEqual([4,4]);
  });

  it("copyMakeBorder constant", async () => {
    const ort = await import("onnxruntime-web");
    const src = new Mat(new ort.Tensor("uint8", new Uint8Array([1,2,3,4]), [2,2]));
    const out = copyMakeBorder(src, 1,1,1,1, BORDER_CONSTANT, new Scalar(9));
    expect(out.tensor.dims).toEqual([4,4]);
    expect((out.tensor.data as Uint8Array)[0]).toBe(9);
  });

  it("threshold binary", async () => {
    const ort = await import("onnxruntime-web");
    const src = new Mat(new ort.Tensor("uint8", new Uint8Array([10,200,100,250]), [2,2]));
    const out = threshold(src, 128, 255, THRESH_BINARY);
    expect(Array.from(out.tensor.data as Uint8Array)).toEqual([0,255,0,255]);
  });
});

describe("Morphology", () => {
  it("closing (rect)", async () => {
    // simple binary with a small hole
    const ort = await import("onnxruntime-web");
    const src = new Mat(new ort.Tensor(
      "uint8",
      new Uint8Array([
        0,0,0,0,0,
        0,255,255,255,0,
        0,255,0,255,0,
        0,255,255,255,0,
        0,0,0,0,0,
      ]),
      [5,5]
    ));
    const k = getStructuringElement(MORPH_RECT, new Size(3,3));
    const out = morphologyEx(src, MORPH_CLOSE, k);
    const arr = Array.from(out.tensor.data as Uint8Array);
    expect(arr.filter(v=>v===0).length).toBe(16); // rough sanity
  });
});

describe("Concat & ROI & convertTo & copyTo", () => {
  it("hconcat/vconcat", async () => {
    const A = Mat.fromArray([[1,2],[3,4]], undefined, "float32");
    const B = Mat.fromArray([[5,6],[7,8]], undefined, "float32");
    const H = hconcat([A,B]);
    const V = vconcat([A,B]);
    expect(H.tensor.dims).toEqual([2,4]);
    expect(V.tensor.dims).toEqual([4,2]);
  });

  it("roi/copyTo/convertTo", async () => {
    const src = Mat.fromArray(
      [
        [1,2,3],
        [4,5,6],
        [7,8,9]
      ],
      undefined, "float32"
    );
    const r = src.roi(new Rect(1,1,2,2));
    expect(r.tensor.dims).toEqual([2,2,1]);
    // Create destination tensor with the same shape as ROI result
    const ort = await import("onnxruntime-web");
    const dst = new Mat(new ort.Tensor("float32", new Float32Array(4), [2,2,1]));
    r.copyTo(dst);
    // Extract 2D data from 3D tensor for comparison
    const data = dst.tensor.data as Float32Array;
    const result = [[data[0], data[1]], [data[2], data[3]]];
    expect(result).toEqual([[5,6],[8,9]]);
    const u8 = dst.convertTo("uint8");
    expect(u8.tensor.type).toBe("uint8");
  });
});

describe("Contours (binary)", () => {
  it("findContours / area / arcLength / approxPolyDP", async () => {
    // simple square
    const img = new Uint8Array(7*7).fill(0);
    for (let y=2;y<=4;y++) for (let x=2;x<=4;x++) img[y*7+x]=255;
    const ort = await import("onnxruntime-web");
    const mat = new Mat(new ort.Tensor("uint8", img, [7,7]));
    const contours = findContours(mat);
    expect(contours.length).toBeGreaterThan(0);
    const area = contourArea(contours[0]);
    const len = arcLength(contours[0], true);
    const approx = approxPolyDP(contours[0], 0.5, true);
    expect(area).toBeGreaterThan(0);
    expect(len).toBeGreaterThan(0);
    expect(approx.length).toBeLessThanOrEqual(contours[0].length);
  });

  it("drawContours outline & filled", async () => {
    const w=20,h=10;
    const rgb = new Uint8Array(w*h*3).fill(0);
    const ort = await import("onnxruntime-web");
    const img = new Mat(new ort.Tensor("uint8", rgb, [h,w,3]));
    const contour = [new Point(2,2), new Point(17,2), new Point(17,7), new Point(2,7)];
    drawContours(img, [contour], -1, new Scalar(255,0,0), 1);
    drawContours(img, [contour], -1, new Scalar(0,255,0), FILLED);
    expect((img.tensor.data as Uint8Array).some(v => v !== 0)).toBe(true);
  });
});

// Canny test is optional, only runs if dependency is present
describe.skipIf(() => { 
  try { 
    // Check if the package exists in node_modules
    const fs = require('fs');
    const path = require('path');
    const packagePath = path.join(process.cwd(), 'node_modules', 'canny-edge-detector');
    return !fs.existsSync(packagePath);
  } catch { 
    return true; 
  } 
})("Canny", () => {
  it("runs canny when dep present", async () => {
    const w=16,h=16;
    const data = new Uint8Array(w*h);
    // vertical edge
    for (let y=0;y<h;y++) data[y*w+8] = 255;
    const ort = await import("onnxruntime-web");
    const gray = new Mat(new ort.Tensor("uint8", data, [h,w]));
    const { Canny } = await import("../src/index.js");
    const edges = Canny(gray);
    expect(edges.tensor.dims).toEqual([h,w]);
  });
});
