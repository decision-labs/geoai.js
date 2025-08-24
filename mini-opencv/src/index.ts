import * as ort from "onnxruntime-web";

/** ===== Constants (subset to support ops below) ===== */
export const CV_8UC1 = "uint8_1c" as const;
export const CV_8UC3 = "uint8_3c" as const; // use dims [H,W,3]
export const CV_8UC4 = "uint8_4c" as const; // use dims [H,W,4]
export const CV_32F  = "float32" as const;
export const CV_8U   = "uint8_1c" as const;

export const COLOR_BGR2RGB   = 0;
export const COLOR_RGB2GRAY  = 1;

export const BORDER_CONSTANT = 0;

export const INTER_NEAREST = 0;
export const INTER_LINEAR  = 1;

export const THRESH_BINARY  = 0;

export const RETR_EXTERNAL  = 0;
export const CHAIN_APPROX_SIMPLE = 0;
export const FILLED = -1;

export const MORPH_RECT  = 0;
export const MORPH_CLOSE = 1;

/** ===== Geometry helpers ===== */
export class Size { constructor(public width: number, public height: number) {} }
export class Point { constructor(public x: number, public y: number) {} }
export class Rect  { constructor(public x: number, public y: number, public width: number, public height: number) {} }

/** Color/Scalar helper (RGBA like OpenCV Scalar) */
export class Scalar {
  public values: [number, number, number, number];
  constructor(r: number, g = 0, b = 0, a = 0) { this.values = [r, g, b, a]; }
  toTensor(dtype: ort.Tensor.Type = "float32"): ort.Tensor {
    const T = dtype === "float32" ? Float32Array : Uint8Array;
    return new ort.Tensor(dtype, new T(this.values) as any, [4]);
  }
}

type DType = ort.Tensor.Type;

/** ===== Mat wrapper (2D/3D tensors) ===== */

/** MatVector class for storing collections of Mat objects (OpenCV.js compatible) */
export class MatVector {
  private elements: Mat[] = [];

  constructor(initialCapacity?: number) {
    // Initialize with empty array, capacity is just for optimization
    this.elements = [];
  }

  size(): number {
    return this.elements.length;
  }

  empty(): boolean {
    return this.elements.length === 0;
  }

  push_back(mat: Mat): void {
    this.elements.push(mat);
  }

  get(index: number): Mat {
    if (index < 0 || index >= this.elements.length) {
      throw new Error("Index out of bounds");
    }
    return this.elements[index];
  }

  set(index: number, mat: Mat): void {
    if (index < 0 || index >= this.elements.length) {
      throw new Error("Index out of bounds");
    }
    this.elements[index] = mat;
  }

  clear(): void {
    this.elements = [];
  }

  resize(newSize: number): void {
    if (newSize < 0) {
      throw new Error("Invalid size");
    }
    
    if (newSize > this.elements.length) {
      // Expand with empty matrices
      const emptyMat = new Mat(new ort.Tensor("uint8", new Uint8Array(0), [0, 0]));
      for (let i = this.elements.length; i < newSize; i++) {
        this.elements.push(emptyMat);
      }
    } else if (newSize < this.elements.length) {
      // Shrink by removing elements
      this.elements = this.elements.slice(0, newSize);
    }
  }

  toArray(): Mat[] {
    return [...this.elements];
  }

  forEach(callback: (mat: Mat, index: number) => void): void {
    this.elements.forEach(callback);
  }
}

/** Create Mat from array data (OpenCV.js compatible) */
export function matFromArray(
  rows: number, 
  cols: number, 
  type: string, 
  data: number[]
): Mat {
  // Validate dimensions
  if (rows < 0 || cols < 0) {
    throw new Error("Invalid dimensions");
  }

  // Determine channels based on type
  let channels = 1;
  let onnxType: ort.Tensor.Type = "uint8";
  
  if (type === CV_8UC3) {
    channels = 3;
    onnxType = "uint8";
  } else if (type === CV_8UC4) {
    channels = 4;
    onnxType = "uint8";
  } else if (type === CV_8UC1 || type === CV_8U) {
    channels = 1;
    onnxType = "uint8";
  } else if (type === CV_32F) {
    channels = 1;
    onnxType = "float32";
  } else {
    throw new Error("Unsupported data type");
  }

  // Handle empty matrix case
  if (rows === 0 || cols === 0) {
    const typedData = onnxType === "float32" ? new Float32Array(0) : new Uint8Array(0);
    const tensor = new ort.Tensor(onnxType, typedData as any, [rows, cols]);
    return new Mat(tensor);
  }

  // Validate data size
  const expectedSize = rows * cols * channels;
  if (data.length !== expectedSize) {
    throw new Error("Data size mismatch");
  }

  // Create typed array based on data type
  let typedData: Uint8Array | Float32Array;
  if (onnxType === "float32") {
    typedData = new Float32Array(data);
  } else {
    typedData = new Uint8Array(data);
  }

  // Create tensor with appropriate dimensions
  const dims = channels === 1 ? [rows, cols] : [rows, cols, channels];
  const tensor = new ort.Tensor(onnxType, typedData as any, dims);
  
  return new Mat(tensor);
}

export class Mat {
  tensor: ort.Tensor;
  
  constructor(tensor: ort.Tensor);
  constructor(rows: number, cols: number, type: string, scalar?: Scalar);
  constructor(tensorOrRows: ort.Tensor | number, cols?: number, type?: string, scalar?: Scalar) {
    if (tensorOrRows instanceof ort.Tensor) {
      // Existing constructor: Mat(tensor)
      this.tensor = tensorOrRows;
    } else {
      // New constructor: Mat(rows, cols, type, scalar?)
      const rows = tensorOrRows as number;
      const colsValue = cols!;
      const typeValue = type!;
      
      // Validate dimensions
      if (rows <= 0 || colsValue <= 0) {
        throw new Error("Invalid dimensions");
      }
      
      // Determine channels and ONNX type
      let channels = 1;
      let onnxType: ort.Tensor.Type = "uint8";
      
      if (typeValue === CV_8UC3) {
        channels = 3;
        onnxType = "uint8";
      } else if (typeValue === CV_8UC4) {
        channels = 4;
        onnxType = "uint8";
      } else if (typeValue === CV_8UC1 || typeValue === CV_8U) {
        channels = 1;
        onnxType = "uint8";
      } else if (typeValue === CV_32F) {
        channels = 1;
        onnxType = "float32";
      } else {
        throw new Error("Unsupported data type");
      }
      
      // Create tensor with appropriate dimensions
      const dims = channels === 1 ? [rows, colsValue] : [rows, colsValue, channels];
      const size = rows * colsValue * channels;
      
      // Create typed array based on data type
      let typedData: Uint8Array | Float32Array;
      if (onnxType === "float32") {
        typedData = new Float32Array(size);
      } else {
        typedData = new Uint8Array(size);
      }
      
      // Fill with scalar value if provided, otherwise zeros
      if (scalar) {
        const values = scalar.values;
        for (let i = 0; i < size; i += channels) {
          for (let c = 0; c < channels; c++) {
            (typedData as any)[i + c] = values[c] || 0;
          }
        }
      }
      // Default is zeros (typed arrays are initialized to 0)
      
      this.tensor = new ort.Tensor(onnxType, typedData as any, dims);
    }
  }

  static fromArray(
    data: number[] | number[][] | number[][][],
    dims?: number[],
    dtype: DType = "float32",
  ): Mat {
    if (Array.isArray(data) && Array.isArray(data[0])) {
      // infer dims for 2D/3D
      if (Array.isArray((data as any)[0][0])) {
        // 3D
        const h = (data as number[][][]).length;
        const w = (data as number[][][])[0].length;
        const c = (data as number[][][])[0][0].length;
        const flat = pickTyped(dtype, h * w * c);
        let k = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let ch = 0; ch < c; ch++)
          (flat as any)[k++] = (data as number[][][])[y][x][ch];
        return new Mat(new ort.Tensor(dtype, flat as any, [h, w, c]));
      } else {
        // 2D
        const r = (data as number[][]).length;
        const c = (data as number[][])[0].length;
        const flat = pickTyped(dtype, r * c);
        let k = 0;
        for (let y = 0; y < r; y++) {
          const row = (data as number[][])[y];
          if (row.length !== c) throw new Error("Inconsistent row lengths");
          for (let x = 0; x < c; x++) (flat as any)[k++] = row[x];
        }
        return new Mat(new ort.Tensor(dtype, flat as any, [r, c]));
      }
    } else {
      if (!dims) throw new Error("dims required for flat array");
      const T = pickTyped(dtype, (data as number[]).length);
      T.set(data as number[]);
      return new Mat(new ort.Tensor(dtype, T as any, dims));
    }
  }

  static zeros(rows: number, cols: number, dtype: DType | string = "float32"): Mat {
    // Handle OpenCV.js constants
    let onnxType: ort.Tensor.Type = "float32";
    if (dtype === CV_8UC1 || dtype === CV_8U) {
      onnxType = "uint8";
    } else if (dtype === CV_32F) {
      onnxType = "float32";
    } else if (typeof dtype === "string" && dtype !== "float32" && dtype !== "uint8") {
      throw new Error(`Unsupported dtype ${dtype}`);
    } else {
      onnxType = dtype as ort.Tensor.Type;
    }
    
    const T = pickTyped(onnxType, rows * cols);
    return new Mat(new ort.Tensor(onnxType, T as any, [rows, cols]));
  }
  static ones(rows: number, cols: number, dtype: DType | string = "float32"): Mat {
    // Handle OpenCV.js constants
    let onnxType: ort.Tensor.Type = "float32";
    if (dtype === CV_8UC1 || dtype === CV_8U) {
      onnxType = "uint8";
    } else if (dtype === CV_32F) {
      onnxType = "float32";
    } else if (typeof dtype === "string" && dtype !== "float32" && dtype !== "uint8") {
      throw new Error(`Unsupported dtype ${dtype}`);
    } else {
      onnxType = dtype as ort.Tensor.Type;
    }
    
    const T = pickTyped(onnxType, rows * cols); T.fill(1);
    return new Mat(new ort.Tensor(onnxType, T as any, [rows, cols]));
  }

  get shape(): readonly number[] { return this.tensor.dims; }
  get rows(): number { return this.tensor.dims[0] ?? 0; }
  get cols(): number { return this.tensor.dims[1] ?? 0; }
  get channels(): number { return this.tensor.dims[2] ?? 1; }

  /** 2D get/set */
  get(y: number, x: number): number {
    if (this.tensor.dims.length < 2) throw new Error("get(y,x) needs 2D+ tensor");
    const [r,c] = this.tensor.dims;
    const i = y * c + x; return (this.tensor.data as any)[i];
  }
  set(y: number, x: number, v: number): void {
    if (this.tensor.dims.length < 2) throw new Error("set(y,x) needs 2D+ tensor");
    const [r,c] = this.tensor.dims;
    const i = y * c + x; (this.tensor.data as any)[i] = v;
  }

  /** ROI (returns a new view-copy Mat) */
  roi(rect: Rect): Mat {
    const [h,w,c=1] = this.tensor.dims;
    const {x,y,width,height} = rect;
    const out = pickTyped(this.tensor.type as DType, width*height*c);
    const src = this.tensor.data as any;
    let k=0;
    for (let yy=0; yy<height; yy++){
      const sy = y+yy;
      for (let xx=0; xx<width; xx++){
        const sx = x+xx;
        const base = (sy*w + sx) * c;
        for (let ch=0; ch<c; ch++) out[k++] = src[base+ch];
      }
    }
    return new Mat(new ort.Tensor(this.tensor.type as DType, out as any, [height, width, c]));
  }

  /** Copy to another Mat (same shape/type). */
  copyTo(dst: Mat): void {
    if (!sameShape(this.tensor.dims, dst.tensor.dims)) throw new Error("shape mismatch");
    (dst.tensor.data as any).set(this.tensor.data as any);
  }

  /** Convert dtype */
  convertTo(dtype: DType): Mat {
    if (dtype === this.tensor.type) return new Mat(this.tensor); // share
    const src = this.tensor.data as any;
    const out = castTo(dtype, src);
    return new Mat(new ort.Tensor(dtype, out as any, [...this.tensor.dims]));
  }

  /** Raw data accessor */
  get data(): any { return this.tensor.data; }

  /** "floatPtr"/"ucharPtr" helpers (row pointer emulation) */
  floatPtr(row: number): Float32Array {
    if (this.tensor.type !== "float32") throw new Error("floatPtr requires float32");
    const [h,w,c=1] = this.tensor.dims;
    const base = row * w * c;
    return (this.tensor.data as Float32Array).subarray(base, base + w*c);
    }
  ucharPtr(row: number): Uint8Array {
    if (this.tensor.type !== "uint8") throw new Error("ucharPtr requires uint8");
    const [h,w,c=1] = this.tensor.dims;
    const base = row * w * c;
    return (this.tensor.data as Uint8Array).subarray(base, base + w*c);
  }

  /** 2D to nested array */
  toArray(): number[][] {
    if (this.tensor.dims.length !== 2) throw new Error("toArray supports 2D");
    const [r,c] = this.tensor.dims;
    const out: number[][] = new Array(r);
    const buf = this.tensor.data as any;
    for (let y=0;y<r;y++){ const row=new Array<number>(c); for (let x=0;x<c;x++) row[x]=buf[y*c+x]; out[y]=row; }
    return out;
  }
}



/** ======= Helpers ======= */
function pickTyped(dtype: DType, n: number): Float32Array | Float64Array | Uint8Array {
  if (dtype === "float32") return new Float32Array(n);
  if (dtype === "float64") return new Float64Array(n);
  if (dtype === "uint8")   return new Uint8Array(n);
  throw new Error(`Unsupported dtype ${dtype}`);
}
function castTo(dtype: DType, src: Float32Array|Float64Array|Uint8Array): Float32Array|Float64Array|Uint8Array {
  const out = pickTyped(dtype, src.length);
  for (let i=0;i<src.length;i++) (out as any)[i] = src[i];
  return out;
}
function sameShape(a: readonly number[], b: readonly number[]): boolean {
  if (a.length!==b.length) return false; for (let i=0;i<a.length;i++) if (a[i]!==b[i]) return false; return true;
}

/** ======= Image Processing ======= */

/** cvtColor: supports COLOR_BGR2RGB and COLOR_RGB2GRAY */
export function cvtColor(src: Mat, code: number): Mat {
  const [h,w,c=1] = src.tensor.dims;
  if (code === COLOR_BGR2RGB) {
    if (c < 3) throw new Error("BGR2RGB requires 3 channels");
    const out = new Uint8Array(h*w*3);
    const s = src.tensor.data as Uint8Array;
    for (let i=0;i<h*w;i++){
      const b = s[i*3], g = s[i*3+1], r = s[i*3+2];
      out[i*3] = r; out[i*3+1] = g; out[i*3+2] = b;
    }
    return new Mat(new ort.Tensor("uint8", out, [h,w,3]));
  }
  if (code === COLOR_RGB2GRAY) {
    if (c < 3) throw new Error("RGB2GRAY requires 3 channels");
    const out = new Uint8Array(h*w);
    const s = src.tensor.data as Uint8Array;
    for (let i=0;i<h*w;i++){
      const r = s[i*3], g = s[i*3+1], b = s[i*3+2];
      out[i] = Math.round(0.299*r + 0.587*g + 0.114*b);
    }
    return new Mat(new ort.Tensor("uint8", out, [h,w]));
  }
  throw new Error("Unsupported cvtColor code");
}

/** resize: nearest / bilinear for 1 or 3 channels (uint8 or float32) */
export function resize(src: Mat, dsize: Size, interpolation = INTER_LINEAR): Mat {
  const [h,w,c=1] = src.tensor.dims;
  const H = dsize.height, W = dsize.width;
  const dtype = src.tensor.type as DType;
  const T = pickTyped(dtype, H*W*c);
  const s = src.tensor.data as any;

  if (interpolation === INTER_NEAREST) {
    for (let y=0;y<H;y++){
      const sy = Math.min(h-1, Math.round(y * (h/H)));
      for (let x=0;x<W;x++){
        const sx = Math.min(w-1, Math.round(x * (w/W)));
        for (let ch=0; ch<c; ch++) {
          T[(y*W + x)*c + ch] = s[(sy*w + sx)*c + ch];
        }
      }
    }
  } else {
    // bilinear
    for (let y=0;y<H;y++){
      const fy = (y+0.5) * (h/H) - 0.5; const y0=Math.max(0, Math.floor(fy)); const y1=Math.min(h-1, y0+1);
      const wy = fy - y0;
      for (let x=0;x<W;x++){
        const fx = (x+0.5) * (w/W) - 0.5; const x0=Math.max(0, Math.floor(fx)); const x1=Math.min(w-1, x0+1);
        const wx = fx - x0;
        for (let ch=0;ch<c;ch++){
          const v00 = s[(y0*w + x0)*c + ch];
          const v01 = s[(y0*w + x1)*c + ch];
          const v10 = s[(y1*w + x0)*c + ch];
          const v11 = s[(y1*w + x1)*c + ch];
          const v0 = v00*(1-wx) + v01*wx;
          const v1 = v10*(1-wx) + v11*wx;
          T[(y*W + x)*c + ch] = v0*(1-wy) + v1*wy;
        }
      }
    }
  }
  const dims = c===1 ? [H,W] : [H,W,c];
  return new Mat(new ort.Tensor(dtype, T as any, dims));
}

/** copyMakeBorder: constant border only */
export function copyMakeBorder(src: Mat, top: number, bottom: number, left: number, right: number, borderType: number, value: Scalar = new Scalar(0,0,0,0)): Mat {
  if (borderType !== BORDER_CONSTANT) throw new Error("Only BORDER_CONSTANT supported");
  const [h,w,c=1] = src.tensor.dims;
  const H = h + top + bottom, W = w + left + right;
  const dtype = src.tensor.type as DType;
  const T = pickTyped(dtype, H*W*c);
  const s = src.tensor.data as any;
  const fill = (dtype === "uint8") ? value.values.map(v => Math.max(0, Math.min(255, v|0))) : value.values;
  // fill background
  for (let i=0;i<H*W;i++) for (let ch=0; ch<c; ch++) (T as any)[i*c + ch] = fill[ch] ?? fill[0];

  // copy src into center
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      for (let ch=0;ch<c;ch++){
        (T as any)[((y+top)*W + (x+left))*c + ch] = s[(y*w + x)*c + ch];
      }
    }
  }
  const dims = c===1 ? [H,W] : [H,W,c];
  return new Mat(new ort.Tensor(dtype, T as any, dims));
}

/** threshold: THRESH_BINARY (uint8 output) */
export function threshold(src: Mat, thresh: number, maxVal: number, type = THRESH_BINARY): Mat {
  if (type !== THRESH_BINARY) throw new Error("Only THRESH_BINARY supported");
  const [h,w,c=1] = src.tensor.dims;
  const out = new Uint8Array(h*w*c);
  const s = src.tensor.data as any;
  for (let i=0;i<out.length;i++) out[i] = s[i] > thresh ? maxVal : 0;
  const dims = c===1 ? [h,w] : [h,w,c];
  return new Mat(new ort.Tensor("uint8", out, dims));
}

/** Structuring element: MORPH_RECT only */
export function getStructuringElement(shape: number, ksize: Size): Mat {
  if (shape !== MORPH_RECT) throw new Error("Only MORPH_RECT supported");
  const out = new Uint8Array(ksize.height * ksize.width); out.fill(1);
  return Mat.fromArray(out as any, [ksize.height, ksize.width], "uint8");
}

/** morphologyEx: MORPH_CLOSE = dilate then erode (binary images) */
export function morphologyEx(src: Mat, op: number, kernel: Mat): Mat {
  if (op !== MORPH_CLOSE) throw new Error("Only MORPH_CLOSE supported");
  const dil = dilateBinary(src, kernel);
  return erodeBinary(dil, kernel);
}

function dilateBinary(src: Mat, kernel: Mat): Mat {
  const [h,w] = src.tensor.dims;
  const [kh,kw] = kernel.tensor.dims;
  const oy = Math.floor(kh/2), ox = Math.floor(kw/2);
  const s = src.tensor.data as Uint8Array;
  const k = kernel.tensor.data as Uint8Array;
  const out = new Uint8Array(h*w);
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      let val = 0;
      for (let yy=0;yy<kh && !val;yy++){
        for (let xx=0;xx<kw && !val;xx++){
          if (!k[yy*kw+xx]) continue;
          const sy=y+yy-oy, sx=x+xx-ox;
          if (sy>=0 && sy<h && sx>=0 && sx<w) val = val || s[sy*w+sx] ? 1 : 0;
        }
      }
      out[y*w+x] = val ? 255 : 0;
    }
  }
  return new Mat(new ort.Tensor("uint8", out, [h,w]));
}
function erodeBinary(src: Mat, kernel: Mat): Mat {
  const [h,w] = src.tensor.dims;
  const [kh,kw] = kernel.tensor.dims;
  const oy = Math.floor(kh/2), ox = Math.floor(kw/2);
  const s = src.tensor.data as Uint8Array;
  const k = kernel.tensor.data as Uint8Array;
  const out = new Uint8Array(h*w);
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      let all = 1;
      for (let yy=0;yy<kh && all;yy++){
        for (let xx=0;xx<kw && all;xx++){
          if (!k[yy*kw+xx]) continue;
          const sy=y+yy-oy, sx=x+xx-ox;
          all = (sy>=0 && sy<h && sx>=0 && sx<w && s[sy*w+sx]>0) ? 1 : 0;
        }
      }
      out[y*w+x] = all ? 255 : 0;
    }
  }
  return new Mat(new ort.Tensor("uint8", out, [h,w]));
}

/** ======= Matrix ops ======= */
export function hconcat(mats: Mat[]): Mat {
  if (mats.length === 0) throw new Error("no mats");
  const [h, , c = mats[0].channels] = mats[0].tensor.dims;
  const dtype = mats[0].tensor.type as DType;
  const widths = mats.map(m => m.tensor.dims[1]);
  const W = widths.reduce((a,b)=>a+b, 0);
  const T = pickTyped(dtype, h*W*c);
  let offset = 0;
  for (const m of mats) {
    if (m.tensor.dims[0]!==h || m.channels!==c) throw new Error("shape mismatch");
    const w = m.tensor.dims[1];
    const s = m.tensor.data as any;
    for (let y=0;y<h;y++){
      for (let x=0;x<w;x++){
        for (let ch=0;ch<c;ch++){
          T[(y*W + (offset+x))*c + ch] = s[(y*w + x)*c + ch];
        }
      }
    }
    offset += w;
  }
  const dims = c===1 ? [h,W] : [h,W,c];
  return new Mat(new ort.Tensor(dtype, T as any, dims));
}
export function vconcat(mats: Mat[]): Mat {
  if (mats.length === 0) throw new Error("no mats");
  const [, w, c = mats[0].channels] = mats[0].tensor.dims;
  const dtype = mats[0].tensor.type as DType;
  const heights = mats.map(m => m.tensor.dims[0]);
  const H = heights.reduce((a,b)=>a+b, 0);
  const T = pickTyped(dtype, H*w*c);
  let offset = 0;
  for (const m of mats) {
    if (m.tensor.dims[1]!==w || m.channels!==c) throw new Error("shape mismatch");
    const h = m.tensor.dims[0];
    const s = m.tensor.data as any;
    for (let y=0;y<h;y++){
      for (let x=0;x<w;x++){
        for (let ch=0;ch<c;ch++){
          T[((offset+y)*w + x)*c + ch] = s[(y*w + x)*c + ch];
        }
      }
    }
    offset += h;
  }
  const dims = c===1 ? [H,w] : [H,w,c];
  return new Mat(new ort.Tensor(dtype, T as any, dims));
}

/** ======= Canny (optional dep) ======= */
export function Canny(gray: Mat): Mat {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // @ts-ignore dynamic import for optional dep
    const cannyEdgeDetector = require("canny-edge-detector");
    // canny-edge-detector expects a grayscale Image-like; we pass an array and dims.
    const [h,w] = gray.tensor.dims;
    const src = gray.tensor.data as Uint8Array;
    // Minimal adapter: library accepts {data,width,height} with 0..255 values
    const img = { data: src, width: w, height: h };
    const out = cannyEdgeDetector(img, {}); // returns grayscale with edges at 255
    const buf = new Uint8Array(out.data ?? out);
    return new Mat(new ort.Tensor("uint8", buf, [h,w]));
  } catch {
    throw new Error("Canny requires optional dependency `canny-edge-detector`. Install it or provide your own.");
  }
}

/** ======= Contours (binary) ======= */
/** Find external contours using Moore-Neighbor tracing on a binary (0/255) image. */
export function findContours(binary: Mat, mode = RETR_EXTERNAL, method = CHAIN_APPROX_SIMPLE): Point[][] {
  const [h,w] = binary.tensor.dims;
  const img = binary.tensor.data as Uint8Array;
  const visited = new Uint8Array(h*w);
  const contours: Point[][] = [];

  const idx = (y:number,x:number)=> y*w + x;
  const dirs = [[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]]; // clockwise

  for (let y=1;y<h-1;y++){
    for (let x=1;x<w-1;x++){
      if (img[idx(y,x)]===255 && !visited[idx(y,x)] && img[idx(y, x-1)]===0) {
        // border start
        let cy=y, cx=x, pd=0;
        const contour: Point[] = [];
        do {
          contour.push(new Point(cx, cy));
          visited[idx(cy,cx)] = 1;
          // find next neighbor starting from pd-1
          let found=false;
          for (let k=0;k<8;k++){
            const d = (pd + 7 + k) % 8;
            const ny = cy + dirs[d][0], nx = cx + dirs[d][1];
            if (ny>=0 && ny<h && nx>=0 && nx<w && img[idx(ny,nx)]===255){
              cy = ny; cx = nx; pd = d; found = true; break;
            }
          }
          if (!found) break;
        } while (!(cx===x && cy===y) || contour.length===1);

        contours.push(method === CHAIN_APPROX_SIMPLE ? compressCollinear(contour) : contour);
      }
    }
  }
  return contours;
}

function compressCollinear(contour: Point[]): Point[] {
  if (contour.length <= 2) return contour;
  const out: Point[] = [contour[0]];
  for (let i=1;i<contour.length-1;i++){
    const a = out[out.length-1], b = contour[i], c = contour[i+1];
    const dx1=b.x-a.x, dy1=b.y-a.y, dx2=c.x-b.x, dy2=c.y-b.y;
    if (dx1*dy2 - dy1*dx2 !== 0) out.push(b); // keep corners
  }
  out.push(contour[contour.length-1]);
  return out;
}

export function contourArea(contour: Point[]): number {
  // signed area polygon
  let area = 0;
  for (let i=0;i<contour.length;i++){
    const a = contour[i], b = contour[(i+1)%contour.length];
    area += a.x*b.y - a.y*b.x;
  }
  return Math.abs(area)/2;
}

export function arcLength(contour: Point[], closed=true): number {
  let len = 0;
  const n = contour.length;
  for (let i=0;i<n-(closed?0:1);i++){
    const a = contour[i], b = contour[(i+1)%n];
    const dx=a.x-b.x, dy=a.y-b.y; len += Math.hypot(dx,dy);
  }
  return len;
}

/** Ramer–Douglas–Peucker simplification as approxPolyDP */
export function approxPolyDP(contour: Point[], epsilon: number, closed=true): Point[] {
  const pts = closed ? contour.slice(0, -1) : contour.slice();
  const res = rdp(pts, epsilon);
  if (closed) res.push(res[0]);
  return res;
}
function rdp(points: Point[], eps: number): Point[] {
  if (points.length < 3) return points.slice();
  const [start, end] = [points[0], points[points.length-1]];
  let maxDist = 0, idx = -1;
  for (let i=1;i<points.length-1;i++){
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) { maxDist=d; idx=i; }
  }
  if (maxDist > eps){
    const left = rdp(points.slice(0, idx+1), eps);
    const right = rdp(points.slice(idx), eps);
    return left.slice(0,-1).concat(right);
  } else {
    return [start, end];
  }
}
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const num = Math.abs((b.x-a.x)*(a.y-p.y) - (a.x-p.x)*(b.y-a.y));
  const den = Math.hypot(b.x-a.x, b.y-a.y) || 1;
  return num/den;
}

/** drawContours: draws with FILLED or 1px outline on a uint8 3-channel RGB */
export function drawContours(img: Mat, contours: Point[][], contourIdx: number, color: Scalar, thickness: number = 1): void {
  const [h,w,c=1] = img.tensor.dims;
  if (c < 3 || img.tensor.type !== "uint8") throw new Error("drawContours expects RGB uint8 image");
  const buf = img.tensor.data as Uint8Array;
  const col = color.values.map(v => Math.max(0, Math.min(255, v|0)));
  const list = (contourIdx >= 0) ? [contours[contourIdx]] : contours;

  if (thickness === FILLED) {
    // naive scanline fill for each polygon
    for (const poly of list) fillPolygon(buf, w, h, poly, col as any);
  } else {
    for (const poly of list) {
      for (let i=0;i<poly.length;i++){
        const a = poly[i], b = poly[(i+1)%poly.length];
        drawLine(buf, w, h, a.x, a.y, b.x, b.y, col as any);
      }
    }
  }
}

function drawLine(buf: Uint8Array, w:number, h:number, x0:number,y0:number,x1:number,y1:number, col:number[]) {
  // Bresenham
  let dx = Math.abs(x1-x0), dy = -Math.abs(y1-y0), sx = x0<x1?1:-1, sy = y0<y1?1:-1, err = dx+dy;
  while(true){
    if (x0>=0&&x0<w&&y0>=0&&y0<h){
      const i = (y0*w + x0)*3; buf[i]=col[0]; buf[i+1]=col[1]; buf[i+2]=col[2];
    }
    if (x0===x1 && y0===y1) break;
    const e2 = 2*err; if (e2>=dy){ err+=dy; x0+=sx; } if (e2<=dx){ err+=dx; y0+=sy; }
  }
}

function fillPolygon(buf: Uint8Array, w:number, h:number, pts: Point[], col:number[]) {
  // simple even-odd scanline fill
  const ys = pts.map(p=>p.y); const minY=Math.max(0, Math.min(...ys)|0); const maxY=Math.min(h-1, Math.max(...ys)|0);
  for (let y=minY; y<=maxY; y++){
    const xs:number[] = [];
    for (let i=0;i<pts.length;i++){
      const a = pts[i], b = pts[(i+1)%pts.length];
      if ((a.y<=y && b.y>y) || (b.y<=y && a.y>y)){
        const x = a.x + (y-a.y)*(b.x-a.x)/(b.y-a.y);
        xs.push(x);
      }
    }
    xs.sort((a,b)=>a-b);
    for (let k=0;k<xs.length; k+=2){
      const x0 = Math.max(0, Math.floor(xs[k]));
      const x1 = Math.min(w-1, Math.floor(xs[k+1] ?? xs[k]));
      for (let x=x0; x<=x1; x++){
        const i = (y*w + x)*3; buf[i]=col[0]; buf[i+1]=col[1]; buf[i+2]=col[2];
      }
    }
  }
}
