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

  /** Memory management - OpenCV.js compatibility */
  delete(): void {
    // In our implementation, we don't need explicit memory management
    // as ONNX Runtime handles tensor memory automatically
    // This method exists for OpenCV.js API compatibility
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
  
  constructor();
  constructor(tensor: ort.Tensor);
  constructor(rows: number, cols: number, type: string, scalar?: Scalar);
  constructor(tensorOrRows?: ort.Tensor | number, cols?: number, type?: string, scalar?: Scalar) {
    if (tensorOrRows === undefined) {
      // Empty constructor: Mat()
      this.tensor = new ort.Tensor("uint8", new Uint8Array(0), [0, 0]);
    } else if (tensorOrRows instanceof ort.Tensor) {
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
  
  /** OpenCV.js compatibility: channels() method */
  channels(): number { return this.tensor.dims[2] ?? 1; }

  /** 2D get/set */
  get(y: number, x: number): number {
    if (this.tensor.dims.length < 2) throw new Error("get(y,x) needs 2D+ tensor");
    const [r,c] = this.tensor.dims;
    if (r === 0 || c === 0) throw new Error("Cannot access empty matrix");
    const i = y * c + x; return (this.tensor.data as any)[i];
  }
  set(y: number, x: number, v: number): void {
    if (this.tensor.dims.length < 2) throw new Error("set(y,x) needs 2D+ tensor");
    const [r,c] = this.tensor.dims;
    if (r === 0 || c === 0) throw new Error("Cannot access empty matrix");
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
  convertTo(dtype: DType): Mat;
  convertTo(dest: Mat, type: string, scale?: number): void;
  convertTo(dtypeOrDest: DType | Mat, type?: string, scale?: number): Mat | void {
    if (dtypeOrDest instanceof Mat) {
      // Destination-based version with type and scale
      const dest = dtypeOrDest;
      const typeValue = type!;
      const scaleValue = scale || 1.0;
      
      if (this.tensor.dims[0] === 0 || this.tensor.dims[1] === 0) {
        throw new Error("Cannot convert empty source matrix");
      }
      
      // Map OpenCV.js constants to ONNX types
      let onnxType: ort.Tensor.Type = "uint8";
      if (typeValue === CV_8UC1 || typeValue === CV_8U) {
        onnxType = "uint8";
      } else if (typeValue === CV_32F) {
        onnxType = "float32";
      } else {
        throw new Error(`Unsupported type constant: ${typeValue}`);
      }
      
      const [h, w, c = 1] = this.tensor.dims;
      const size = h * w * c;
      const src = this.tensor.data as any;
      
      // Create output data based on target type
      let out: Uint8Array | Float32Array;
      if (onnxType === "uint8") {
        out = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
          const scaledValue = src[i] * scaleValue;
          out[i] = Math.max(0, Math.min(255, Math.round(scaledValue)));
        }
      } else {
        out = new Float32Array(size);
        for (let i = 0; i < size; i++) {
          out[i] = src[i] * scaleValue;
        }
      }
      
      // Create tensor and assign to destination
      dest.tensor = new ort.Tensor(onnxType, out as any, [...this.tensor.dims]);
    } else {
      // Return-based version
      const dtype = dtypeOrDest;
      if (dtype === this.tensor.type) return new Mat(this.tensor); // share
      const src = this.tensor.data as any;
      const out = castTo(dtype, src);
      return new Mat(new ort.Tensor(dtype, out as any, [...this.tensor.dims]));
    }
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

  /** Memory management - OpenCV.js compatibility */
  delete(): void {
    // In our implementation, we don't need explicit memory management
    // as ONNX Runtime handles tensor memory automatically
    // This method exists for OpenCV.js API compatibility
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
export function cvtColor(src: Mat, code: number): Mat;
export function cvtColor(src: Mat, dest: Mat, code: number): void;
export function cvtColor(src: Mat, codeOrDest: number | Mat, code?: number): Mat | void {
  if (codeOrDest instanceof Mat) {
    // Destination-based version: cvtColor(src, dest, code)
    const dest = codeOrDest;
    const colorCode = code!;
    
    const [h, w, c = 1] = src.tensor.dims;
    
    if (h === 0 || w === 0) {
      throw new Error("Cannot convert empty source matrix");
    }
    
    if (colorCode === COLOR_BGR2RGB) {
      if (c < 3) throw new Error("BGR2RGB requires 3 channels");
      const out = new Uint8Array(h * w * 3);
      const s = src.tensor.data as Uint8Array;
      for (let i = 0; i < h * w; i++) {
        const b = s[i * 3], g = s[i * 3 + 1], r = s[i * 3 + 2];
        out[i * 3] = r; out[i * 3 + 1] = g; out[i * 3 + 2] = b;
      }
      dest.tensor = new ort.Tensor("uint8", out, [h, w, 3]);
    } else if (colorCode === COLOR_RGB2GRAY) {
      if (c < 3) throw new Error("RGB2GRAY requires 3 channels");
      const out = new Uint8Array(h * w);
      const s = src.tensor.data as Uint8Array;
      for (let i = 0; i < h * w; i++) {
        const r = s[i * 3], g = s[i * 3 + 1], b = s[i * 3 + 2];
        out[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      }
      dest.tensor = new ort.Tensor("uint8", out, [h, w]);
    } else {
      throw new Error("Unsupported cvtColor code");
    }
  } else {
    // Return-based version: cvtColor(src, code)
    const colorCode = codeOrDest;
    const [h, w, c = 1] = src.tensor.dims;
    
    if (colorCode === COLOR_BGR2RGB) {
      if (c < 3) throw new Error("BGR2RGB requires 3 channels");
      const out = new Uint8Array(h * w * 3);
      const s = src.tensor.data as Uint8Array;
      for (let i = 0; i < h * w; i++) {
        const b = s[i * 3], g = s[i * 3 + 1], r = s[i * 3 + 2];
        out[i * 3] = r; out[i * 3 + 1] = g; out[i * 3 + 2] = b;
      }
      return new Mat(new ort.Tensor("uint8", out, [h, w, 3]));
    }
    if (colorCode === COLOR_RGB2GRAY) {
      if (c < 3) throw new Error("RGB2GRAY requires 3 channels");
      const out = new Uint8Array(h * w);
      const s = src.tensor.data as Uint8Array;
      for (let i = 0; i < h * w; i++) {
        const r = s[i * 3], g = s[i * 3 + 1], b = s[i * 3 + 2];
        out[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      }
      return new Mat(new ort.Tensor("uint8", out, [h, w]));
    }
    throw new Error("Unsupported cvtColor code");
  }
}

/** resize: nearest / bilinear for 1 or 3 channels (uint8 or float32) */
export function resize(src: Mat, dsize: Size, interpolation?: number): Mat;
export function resize(src: Mat, dest: Mat, dsize: Size, fx: number, fy: number, interpolation: number): void;
export function resize(src: Mat, dsizeOrDest: Size | Mat, interpolationOrDsize?: number | Size, fx?: number, fy?: number, interpolation?: number): Mat | void {
  if (dsizeOrDest instanceof Mat) {
    // Advanced version: resize(src, dest, dsize, fx, fy, interpolation)
    const dest = dsizeOrDest;
    const dsize = interpolationOrDsize as Size;
    const fxScale = fx!;
    const fyScale = fy!;
    const interpMethod = interpolation || INTER_LINEAR;
    
    const [h, w, c = 1] = src.tensor.dims;
    
    if (h === 0 || w === 0) {
      throw new Error("Cannot resize empty source matrix");
    }
    
    // Determine target dimensions
    let H: number, W: number;
    if (dsize.width > 0 && dsize.height > 0) {
      // Use explicit size
      H = dsize.height;
      W = dsize.width;
    } else if (dsize.width === 0 && dsize.height === 0) {
      // Use scale factors
      if (fxScale <= 0 || fyScale <= 0) {
        throw new Error("Invalid scale factors");
      }
      H = Math.round(h * fyScale);
      W = Math.round(w * fxScale);
    } else {
      throw new Error("Invalid size parameters");
    }
    
    if (H <= 0 || W <= 0) {
      throw new Error("Invalid target dimensions");
    }
    
    const dtype = src.tensor.type as DType;
    const T = pickTyped(dtype, H * W * c);
    const s = src.tensor.data as any;
    
    if (interpMethod === INTER_NEAREST) {
      for (let y = 0; y < H; y++) {
        const sy = Math.min(h - 1, Math.round(y * (h / H)));
        for (let x = 0; x < W; x++) {
          const sx = Math.min(w - 1, Math.round(x * (w / W)));
          for (let ch = 0; ch < c; ch++) {
            T[(y * W + x) * c + ch] = s[(sy * w + sx) * c + ch];
          }
        }
      }
    } else {
      // bilinear
      for (let y = 0; y < H; y++) {
        const fy = (y + 0.5) * (h / H) - 0.5;
        const y0 = Math.max(0, Math.floor(fy));
        const y1 = Math.min(h - 1, y0 + 1);
        const wy = fy - y0;
        for (let x = 0; x < W; x++) {
          const fx = (x + 0.5) * (w / W) - 0.5;
          const x0 = Math.max(0, Math.floor(fx));
          const x1 = Math.min(w - 1, x0 + 1);
          const wx = fx - x0;
          for (let ch = 0; ch < c; ch++) {
            const v00 = s[(y0 * w + x0) * c + ch];
            const v01 = s[(y0 * w + x1) * c + ch];
            const v10 = s[(y1 * w + x0) * c + ch];
            const v11 = s[(y1 * w + x1) * c + ch];
            const v0 = v00 * (1 - wx) + v01 * wx;
            const v1 = v10 * (1 - wx) + v11 * wx;
            T[(y * W + x) * c + ch] = v0 * (1 - wy) + v1 * wy;
          }
        }
      }
    }
    
    const dims = c === 1 ? [H, W] : [H, W, c];
    dest.tensor = new ort.Tensor(dtype, T as any, dims);
  } else {
    // Return-based version: resize(src, dsize, interpolation?)
    const dsize = dsizeOrDest;
    const interpMethod = (interpolationOrDsize as number) || INTER_LINEAR;
    
    const [h, w, c = 1] = src.tensor.dims;
    const H = dsize.height, W = dsize.width;
    const dtype = src.tensor.type as DType;
    const T = pickTyped(dtype, H * W * c);
    const s = src.tensor.data as any;

    if (interpMethod === INTER_NEAREST) {
      for (let y = 0; y < H; y++) {
        const sy = Math.min(h - 1, Math.round(y * (h / H)));
        for (let x = 0; x < W; x++) {
          const sx = Math.min(w - 1, Math.round(x * (w / W)));
          for (let ch = 0; ch < c; ch++) {
            T[(y * W + x) * c + ch] = s[(sy * w + sx) * c + ch];
          }
        }
      }
    } else {
      // bilinear
      for (let y = 0; y < H; y++) {
        const fy = (y + 0.5) * (h / H) - 0.5;
        const y0 = Math.max(0, Math.floor(fy));
        const y1 = Math.min(h - 1, y0 + 1);
        const wy = fy - y0;
        for (let x = 0; x < W; x++) {
          const fx = (x + 0.5) * (w / W) - 0.5;
          const x0 = Math.max(0, Math.floor(fx));
          const x1 = Math.min(w - 1, x0 + 1);
          const wx = fx - x0;
          for (let ch = 0; ch < c; ch++) {
            const v00 = s[(y0 * w + x0) * c + ch];
            const v01 = s[(y0 * w + x1) * c + ch];
            const v10 = s[(y1 * w + x0) * c + ch];
            const v11 = s[(y1 * w + x1) * c + ch];
            const v0 = v00 * (1 - wx) + v01 * wx;
            const v1 = v10 * (1 - wx) + v11 * wx;
            T[(y * W + x) * c + ch] = v0 * (1 - wy) + v1 * wy;
          }
        }
      }
    }
    const dims = c === 1 ? [H, W] : [H, W, c];
    return new Mat(new ort.Tensor(dtype, T as any, dims));
  }
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
export function threshold(src: Mat, thresh: number, maxVal: number, type?: number): Mat;
export function threshold(src: Mat, dest: Mat, thresh: number, maxVal: number, type: number): void;
export function threshold(src: Mat, threshOrDest: number | Mat, maxValOrThresh?: number, typeOrMaxVal?: number, type?: number): Mat | void {
  if (threshOrDest instanceof Mat) {
    // Destination-based version: threshold(src, dest, thresh, maxVal, type)
    const dest = threshOrDest;
    const thresh = maxValOrThresh!;
    const maxVal = typeOrMaxVal!;
    const threshType = type!;
    
    if (threshType !== THRESH_BINARY) throw new Error("Only THRESH_BINARY supported");
    
    const [h, w, c = 1] = src.tensor.dims;
    
    if (h === 0 || w === 0) {
      throw new Error("Cannot threshold empty source matrix");
    }
    
    const out = new Uint8Array(h * w * c);
    const s = src.tensor.data as any;
    
    for (let i = 0; i < out.length; i++) {
      out[i] = s[i] > thresh ? maxVal : 0;
    }
    
    const dims = c === 1 ? [h, w] : [h, w, c];
    dest.tensor = new ort.Tensor("uint8", out, dims);
  } else {
    // Return-based version: threshold(src, thresh, maxVal, type?)
    const thresh = threshOrDest;
    const maxVal = maxValOrThresh!;
    const threshType = typeOrMaxVal || THRESH_BINARY;
    
    if (threshType !== THRESH_BINARY) throw new Error("Only THRESH_BINARY supported");
    
    const [h, w, c = 1] = src.tensor.dims;
    const out = new Uint8Array(h * w * c);
    const s = src.tensor.data as any;
    
    for (let i = 0; i < out.length; i++) {
      out[i] = s[i] > thresh ? maxVal : 0;
    }
    
    const dims = c === 1 ? [h, w] : [h, w, c];
    return new Mat(new ort.Tensor("uint8", out, dims));
  }
}

/** Structuring element: MORPH_RECT only */
export function getStructuringElement(shape: number, ksize: Size): Mat {
  if (shape !== MORPH_RECT) throw new Error("Only MORPH_RECT supported");
  const out = new Uint8Array(ksize.height * ksize.width); out.fill(1);
  return Mat.fromArray(out as any, [ksize.height, ksize.width], "uint8");
}

/** morphologyEx: MORPH_CLOSE = dilate then erode (binary images) */
export function morphologyEx(src: Mat, op: number, kernel: Mat): Mat;
export function morphologyEx(src: Mat, op: number, kernel: Mat, dest: Mat): void;
export function morphologyEx(src: Mat, dest: Mat, op: number, kernel: Mat): void;
export function morphologyEx(src: Mat, dest: Mat, op: number, kernel: Mat, anchor: Point, iterations: number): void;
export function morphologyEx(src: Mat, opOrDest: number | Mat, kernelOrOp: Mat | number, destOrKernel?: Mat, anchor?: Point, iterations?: number): Mat | void {
  if (opOrDest instanceof Mat) {
    // Destination-based versions: morphologyEx(src, dest, op, kernel, anchor?, iterations?)
    const dest = opOrDest;
    const op = kernelOrOp as number;
    const kernel = destOrKernel!;
    const anchorPoint = anchor || new Point(-1, -1);
    const iterCount = iterations || 1;
    
    if (op !== MORPH_CLOSE) throw new Error("Only MORPH_CLOSE supported");
    
    if (src.tensor.dims[0] === 0 || src.tensor.dims[1] === 0) {
      throw new Error("Cannot apply morphology to empty source matrix");
    }
    
    if (kernel.tensor.dims[0] === 0 || kernel.tensor.dims[1] === 0) {
      throw new Error("Cannot apply morphology with empty kernel");
    }
    
    // Apply morphological closing multiple times
    let current = src;
    for (let i = 0; i < Math.max(0, iterCount); i++) {
      const dil = dilateBinary(current, kernel);
      current = erodeBinary(dil, kernel);
    }
    
    // Ensure destination has correct size and type
    if (dest.tensor.dims[0] !== current.tensor.dims[0] || 
        dest.tensor.dims[1] !== current.tensor.dims[1] || 
        dest.tensor.type !== current.tensor.type) {
      dest.tensor = current.tensor;
    } else {
      // Copy data to destination
      (dest.tensor.data as any).set(current.tensor.data as any);
    }
  } else {
    // Simple versions: morphologyEx(src, op, kernel) or morphologyEx(src, op, kernel, dest)
    const op = opOrDest;
    const kernel = kernelOrOp as Mat;
    const dest = destOrKernel;
    
    if (op !== MORPH_CLOSE) throw new Error("Only MORPH_CLOSE supported");
    
    if (dest === undefined) {
      // Return-based version
      const dil = dilateBinary(src, kernel);
      return erodeBinary(dil, kernel);
    } else {
      // Destination-based version
      const dil = dilateBinary(src, kernel);
      const result = erodeBinary(dil, kernel);
      
      // Ensure destination has correct size and type
      if (dest.tensor.dims[0] !== result.tensor.dims[0] || 
          dest.tensor.dims[1] !== result.tensor.dims[1] || 
          dest.tensor.type !== result.tensor.type) {
        dest.tensor = result.tensor;
      } else {
        // Copy data to destination
        (dest.tensor.data as any).set(result.tensor.data as any);
      }
    }
  }
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
export function hconcat(mats: Mat[]): Mat;
export function hconcat(matVector: MatVector, dest: Mat): void;
export function hconcat(matsOrVector: Mat[] | MatVector, dest?: Mat): Mat | void {
  if (Array.isArray(matsOrVector)) {
    // Original array-based version
    const mats = matsOrVector;
    if (mats.length === 0) throw new Error("no mats");
    const [h, , c = mats[0].channels()] = mats[0].tensor.dims;
    const dtype = mats[0].tensor.type as DType;
    const widths = mats.map(m => m.tensor.dims[1]);
    const W = widths.reduce((a,b)=>a+b, 0);
    const T = pickTyped(dtype, h*W*c);
    let offset = 0;
    for (const m of mats) {
      if (m.tensor.dims[0]!==h || m.channels()!==c) throw new Error("shape mismatch");
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
  } else {
    // MatVector with destination version
    const matVector = matsOrVector;
    if (!dest) throw new Error("Destination matrix required for MatVector version");
    if (matVector.size() === 0) throw new Error("no mats");
    
    const mats = matVector.toArray();
    const [h, , c = mats[0].channels()] = mats[0].tensor.dims;
    const dtype = mats[0].tensor.type as DType;
    const widths = mats.map(m => m.tensor.dims[1]);
    const W = widths.reduce((a,b)=>a+b, 0);
    
    // Ensure destination has correct size and type
    if (dest.tensor.dims[0] !== h || dest.tensor.dims[1] !== W || dest.tensor.type !== dtype) {
      // Create new tensor for destination
      const T = pickTyped(dtype, h*W*c);
      dest.tensor = new ort.Tensor(dtype, T as any, c===1 ? [h,W] : [h,W,c]);
    }
    
    let offset = 0;
    for (const m of mats) {
      if (m.tensor.dims[0]!==h || m.channels()!==c) throw new Error("shape mismatch");
      const w = m.tensor.dims[1];
      const s = m.tensor.data as any;
      const d = dest.tensor.data as any;
      for (let y=0;y<h;y++){
        for (let x=0;x<w;x++){
          for (let ch=0;ch<c;ch++){
            d[(y*W + (offset+x))*c + ch] = s[(y*w + x)*c + ch];
          }
        }
      }
      offset += w;
    }
  }
}
export function vconcat(mats: Mat[]): Mat;
export function vconcat(matVector: MatVector, dest: Mat): void;
export function vconcat(matsOrVector: Mat[] | MatVector, dest?: Mat): Mat | void {
  if (Array.isArray(matsOrVector)) {
    // Original array-based version
    const mats = matsOrVector;
    if (mats.length === 0) throw new Error("no mats");
    const [, w, c = mats[0].channels()] = mats[0].tensor.dims;
    const dtype = mats[0].tensor.type as DType;
    const heights = mats.map(m => m.tensor.dims[0]);
    const H = heights.reduce((a,b)=>a+b, 0);
    const T = pickTyped(dtype, H*w*c);
    let offset = 0;
    for (const m of mats) {
      if (m.tensor.dims[1]!==w || m.channels()!==c) throw new Error("shape mismatch");
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
  } else {
    // MatVector with destination version
    const matVector = matsOrVector;
    if (!dest) throw new Error("Destination matrix required for MatVector version");
    if (matVector.size() === 0) throw new Error("no mats");
    
    const mats = matVector.toArray();
    const [, w, c = mats[0].channels()] = mats[0].tensor.dims;
    const dtype = mats[0].tensor.type as DType;
    const heights = mats.map(m => m.tensor.dims[0]);
    const H = heights.reduce((a,b)=>a+b, 0);
    
    // Ensure destination has correct size and type
    if (dest.tensor.dims[0] !== H || dest.tensor.dims[1] !== w || dest.tensor.type !== dtype) {
      // Create new tensor for destination
      const T = pickTyped(dtype, H*w*c);
      dest.tensor = new ort.Tensor(dtype, T as any, c===1 ? [H,w] : [H,w,c]);
    }
    
    let offset = 0;
    for (const m of mats) {
      if (m.tensor.dims[1]!==w || m.channels()!==c) throw new Error("shape mismatch");
      const h = m.tensor.dims[0];
      const s = m.tensor.data as any;
      const d = dest.tensor.data as any;
      for (let y=0;y<h;y++){
        for (let x=0;x<w;x++){
          for (let ch=0;ch<c;ch++){
            d[((offset+y)*w + x)*c + ch] = s[(y*w + x)*c + ch];
          }
        }
      }
      offset += h;
    }
  }
}

/** ======= Canny (optional dep) ======= */
export function Canny(gray: Mat): Mat;
export function Canny(gray: Mat, dest: Mat, lowThreshold: number, highThreshold: number): void;
export function Canny(gray: Mat, dest?: Mat, lowThreshold?: number, highThreshold?: number): Mat | void {
  const [h,w] = gray.tensor.dims;
  const src = gray.tensor.data as Uint8Array;
  
  // Simple edge detection implementation as fallback
  const buf = new Uint8Array(h*w);
  const lowThresh = lowThreshold || 100;
  const highThresh = highThreshold || 200;
  
  // Simple gradient-based edge detection
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      const idx = y * w + x;
      const current = src[idx];
      
      // Simple gradient calculation
      const gx = src[idx + 1] - src[idx - 1];
      const gy = src[(y + 1) * w + x] - src[(y - 1) * w + x];
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      
      // Apply thresholds
      if (magnitude > highThresh) {
        buf[idx] = 255;
      } else if (magnitude > lowThresh) {
        buf[idx] = 128; // Weak edge
      } else {
        buf[idx] = 0;
      }
    }
  }
  
  if (dest === undefined) {
    // Return-based version
    return new Mat(new ort.Tensor("uint8", buf, [h,w]));
  } else {
    // Destination-based version
    // Ensure destination has correct size and type
    if (dest.tensor.dims[0] !== h || dest.tensor.dims[1] !== w || dest.tensor.type !== "uint8") {
      dest.tensor = new ort.Tensor("uint8", buf, [h, w]);
    } else {
      // Copy data to destination
      (dest.tensor.data as Uint8Array).set(buf);
    }
  }
}

/** ======= Contours (binary) ======= */
/** Find external contours using Moore-Neighbor tracing on a binary (0/255) image. */
export function findContours(binary: Mat, mode?: number, method?: number): Point[][];
export function findContours(binary: Mat, contours: MatVector, hierarchy: Mat, mode?: number, method?: number): void;
export function findContours(binary: Mat, contoursOrMode?: MatVector | number, hierarchyOrMethod?: Mat | number, mode?: number, method?: number): Point[][] | void {
  const [h,w] = binary.tensor.dims;
  const img = binary.tensor.data as Uint8Array;
  
  if (h === 0 || w === 0) {
    throw new Error("Empty binary image");
  }
  
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
  
  if (contoursOrMode instanceof MatVector) {
    // MatVector version - populate the MatVector with contour matrices
    const contoursVector = contoursOrMode;
    const hierarchyMat = hierarchyOrMethod as Mat;
    
    contoursVector.clear();
    
    for (const contour of contours) {
      // Convert Point[] to Mat
      const contourData = new Float32Array(contour.length * 2);
      for (let i = 0; i < contour.length; i++) {
        contourData[i * 2] = contour[i].x;
        contourData[i * 2 + 1] = contour[i].y;
      }
      const contourMat = new Mat(new ort.Tensor("float32", contourData, [contour.length, 2]));
      contoursVector.push_back(contourMat);
    }
    
    // Create hierarchy matrix (simplified - just zeros for now)
    const hierarchyData = new Float32Array(contours.length * 4);
    hierarchyMat.tensor = new ort.Tensor("float32", hierarchyData, [contours.length, 4]);
  } else {
    // Return-based version
    return contours;
  }
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

export function contourArea(contour: Point[]): number;
export function contourArea(contour: Mat): number;
export function contourArea(contour: Point[] | Mat): number {
  if (Array.isArray(contour)) {
    // Point[] version
    const points = contour;
    let area = 0;
    for (let i=0;i<points.length;i++){
      const a = points[i], b = points[(i+1)%points.length];
      area += a.x*b.y - a.y*b.x;
    }
    return Math.abs(area)/2;
  } else {
    // Mat version
    const mat = contour;
    const [rows, cols] = mat.tensor.dims;
    
    if (rows === 0 || cols === 0) {
      throw new Error("Empty contour matrix");
    }
    
    if (cols !== 2) {
      throw new Error("Contour matrix must have 2 columns (x, y coordinates)");
    }
    
    if (rows < 3) {
      return 0; // Not enough points to form a polygon
    }
    
    const data = mat.tensor.data as any;
    let area = 0;
    
    for (let i = 0; i < rows; i++) {
      const a = { x: data[i * 2], y: data[i * 2 + 1] };
      const b = { x: data[((i + 1) % rows) * 2], y: data[((i + 1) % rows) * 2 + 1] };
      area += a.x * b.y - a.y * b.x;
    }
    
    return Math.abs(area) / 2;
  }
}

export function arcLength(contour: Point[], closed?: boolean): number;
export function arcLength(contour: Mat, closed?: boolean): number;
export function arcLength(contour: Point[] | Mat, closed: boolean = true): number {
  if (Array.isArray(contour)) {
    // Point[] version
    const points = contour;
    let len = 0;
    const n = points.length;
    for (let i = 0; i < n - (closed ? 0 : 1); i++) {
      const a = points[i], b = points[(i + 1) % n];
      const dx = a.x - b.x, dy = a.y - b.y;
      len += Math.hypot(dx, dy);
    }
    return len;
  } else {
    // Mat version
    const mat = contour;
    const [rows, cols] = mat.tensor.dims;
    
    if (rows === 0 || cols === 0) {
      throw new Error("Empty contour matrix");
    }
    
    if (cols !== 2) {
      throw new Error("Contour matrix must have 2 columns (x, y coordinates)");
    }
    
    if (rows < 1) {
      return 0; // No points
    }
    
    if (rows === 1) {
      return 0; // Single point has no length
    }
    
    const data = mat.tensor.data as any;
    let len = 0;
    
    for (let i = 0; i < rows - (closed ? 0 : 1); i++) {
      const a = { x: data[i * 2], y: data[i * 2 + 1] };
      const b = { x: data[((i + 1) % rows) * 2], y: data[((i + 1) % rows) * 2 + 1] };
      const dx = a.x - b.x, dy = a.y - b.y;
      len += Math.hypot(dx, dy);
    }
    
    return len;
  }
}

/** Ramer–Douglas–Peucker simplification as approxPolyDP */
export function approxPolyDP(contour: Point[], epsilon: number, closed?: boolean): Point[];
export function approxPolyDP(contour: Point[], dest: Mat, epsilon: number, closed: boolean): void;
export function approxPolyDP(contour: Mat, dest: Mat, epsilon: number, closed: boolean): void;
export function approxPolyDP(contour: Point[] | Mat, epsilonOrDest: number | Mat, closedOrEpsilon?: boolean | number, closed?: boolean): Point[] | void {
  if (epsilonOrDest instanceof Mat) {
    // Destination-based version: approxPolyDP(contour, dest, epsilon, closed)
    const dest = epsilonOrDest;
    const epsilon = closedOrEpsilon as number;
    const closedValue = closed!;
    
    let pointsContour: Point[];
    
    if (Array.isArray(contour)) {
      // Point[] version
      if (contour.length === 0) {
        throw new Error("Empty contour");
      }
      pointsContour = contour;
    } else {
      // Mat version - convert Mat to Point[]
      const mat = contour as Mat;
      const [rows, cols] = mat.tensor.dims;
      
      if (rows === 0 || cols === 0) {
        throw new Error("Empty contour matrix");
      }
      
      if (cols !== 2) {
        throw new Error("Contour matrix must have 2 columns (x, y coordinates)");
      }
      
      const data = mat.tensor.data as any;
      pointsContour = [];
      for (let i = 0; i < rows; i++) {
        pointsContour.push(new Point(data[i * 2], data[i * 2 + 1]));
      }
    }
    
    // Apply approximation
    let pts = closedValue ? pointsContour.slice(0, -1) : pointsContour.slice();
    if (pts.length === 0 && pointsContour.length === 1) {
      // Handle single point case for closed contours
      pts = pointsContour.slice();
    }
    const res = rdp(pts, epsilon);
    if (closedValue && res.length > 0 && pts.length > 1) res.push(res[0]);
    
    // Convert result to Mat
    const resultData = new Float32Array(res.length * 2);
    for (let i = 0; i < res.length; i++) {
      resultData[i * 2] = res[i].x;
      resultData[i * 2 + 1] = res[i].y;
    }
    
    dest.tensor = new ort.Tensor("float32", resultData, [res.length, 2]);
  } else {
    // Return-based version: approxPolyDP(contour, epsilon, closed?)
    const epsilon = epsilonOrDest;
    const closedValue = (closedOrEpsilon ?? true) as boolean;
    
    // This version only works with Point[] contours
    if (!Array.isArray(contour)) {
      throw new Error("Return-based approxPolyDP only supports Point[] contours. Use Mat version with destination parameter.");
    }
    
    let pts = closedValue ? contour.slice(0, -1) : contour.slice();
    if (pts.length === 0 && contour.length === 1) {
      // Handle single point case for closed contours
      pts = contour.slice();
    }
    const res = rdp(pts, epsilon);
    if (closedValue && res.length > 0 && pts.length > 1) res.push(res[0]);
    return res;
  }
}
function rdp(points: Point[], eps: number): Point[] {
  if (points.length <= 2) return points.slice();
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
export function drawContours(img: Mat, contours: Point[][], contourIdx: number, color: Scalar, thickness?: number): void;
export function drawContours(img: Mat, contours: MatVector, contourIdx: number, color: Scalar, thickness?: number): void;
export function drawContours(img: Mat, contours: Point[][] | MatVector, contourIdx: number, color: Scalar, thickness: number = 1): void {
  const [h,w,c=1] = img.tensor.dims;
  
  if (h === 0 || w === 0) {
    throw new Error("Empty image");
  }
  
  if (Array.isArray(contours)) {
    // Point[][] version
    const pointsArray = contours;
    
    if (contourIdx >= pointsArray.length) {
      throw new Error("Invalid contour index");
    }
    
    const buf = img.tensor.data as Uint8Array;
    const col = color.values.map(v => Math.max(0, Math.min(255, v|0)));
    const list = (contourIdx >= 0) ? [pointsArray[contourIdx]] : pointsArray;

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
  } else {
    // MatVector version
    const contoursVector = contours;
    
    if (contourIdx >= contoursVector.size()) {
      throw new Error("Invalid contour index");
    }
    
    const buf = img.tensor.data as Uint8Array;
    const col = color.values.map(v => Math.max(0, Math.min(255, v|0)));
    const contourMat = contoursVector.get(contourIdx);
    const [contourRows, contourCols] = contourMat.tensor.dims;
    
    if (contourCols !== 2) {
      throw new Error("Contour matrix must have 2 columns (x, y coordinates)");
    }
    
    const contourData = contourMat.tensor.data as Float32Array;
    
    // Convert Mat contour to Point[] for existing drawing functions
    const points: Point[] = [];
    for (let i = 0; i < contourRows; i++) {
      points.push(new Point(contourData[i * 2], contourData[i * 2 + 1]));
    }
    
    if (thickness === FILLED) {
      fillPolygon(buf, w, h, points, col as any);
    } else {
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
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
