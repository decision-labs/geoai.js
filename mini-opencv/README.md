# Mini-OpenCV

A lightweight OpenCV.js alternative built on top of ONNX Runtime Web. This library provides essential computer vision operations with a much smaller bundle size compared to the full OpenCV.js library.

## Features

- **Lightweight**: Significantly smaller bundle size than OpenCV.js
- **ONNX Runtime Web**: Built on top of efficient ONNX Runtime Web
- **TypeScript**: Full TypeScript support with type definitions
- **OpenCV-like API**: Familiar API design for easy migration
- **Essential Operations**: Core image processing and computer vision functions

## Installation

```bash
npm install mini-cv-tensor
```

## Quick Start

```typescript
import { Mat, cvtColor, resize, findContours } from 'mini-cv-tensor';

// Create a matrix from array
const image = Mat.fromArray([
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255]
], undefined, "uint8");

// Convert to grayscale
const gray = cvtColor(image, COLOR_RGB2GRAY);

// Resize image
const resized = resize(gray, new Size(100, 100));

// Find contours
const contours = findContours(resized);
```

## API Reference

### Core Classes

#### `Mat`

The main matrix class that wraps ONNX Runtime tensors.

```typescript
class Mat {
  tensor: ort.Tensor;
  
  constructor(tensor: ort.Tensor)
  
  // Static factory methods
  static fromArray(data: number[] | number[][] | number[][][], dims?: number[], dtype?: DType): Mat
  static zeros(rows: number, cols: number, dtype?: DType): Mat
  static ones(rows: number, cols: number, dtype?: DType): Mat
  
  // Properties
  get shape(): readonly number[]
  get rows(): number
  get cols(): number
  get channels(): number
  get data(): any
  
  // Methods
  get(y: number, x: number): number
  set(y: number, x: number, v: number): void
  roi(rect: Rect): Mat
  copyTo(dst: Mat): void
  convertTo(dtype: DType): Mat
  floatPtr(row: number): Float32Array
  ucharPtr(row: number): Uint8Array
  toArray(): number[][]
}
```

#### `Size`

Represents dimensions (width, height).

```typescript
class Size {
  constructor(public width: number, public height: number)
}
```

#### `Point`

Represents a 2D point (x, y).

```typescript
class Point {
  constructor(public x: number, public y: number)
}
```

#### `Rect`

Represents a rectangle (x, y, width, height).

```typescript
class Rect {
  constructor(public x: number, public y: number, public width: number, public height: number)
}
```

#### `Scalar`

Represents RGBA color values.

```typescript
class Scalar {
  public values: [number, number, number, number];
  
  constructor(r: number, g?: number, b?: number, a?: number)
  toTensor(dtype?: ort.Tensor.Type): ort.Tensor
}
```

### Constants

#### Data Types
```typescript
CV_8UC1 = "uint8"    // 1-channel 8-bit unsigned
CV_8UC3 = "uint8"    // 3-channel 8-bit unsigned (use dims [H,W,3])
CV_8UC4 = "uint8"    // 4-channel 8-bit unsigned (use dims [H,W,4])
CV_32F = "float32"   // 32-bit float
CV_8U = "uint8"      // 8-bit unsigned
```

#### Color Conversion Codes
```typescript
COLOR_BGR2RGB = 0    // BGR to RGB conversion
COLOR_RGB2GRAY = 1   // RGB to grayscale conversion
```

#### Border Types
```typescript
BORDER_CONSTANT = 0  // Constant border
```

#### Interpolation Methods
```typescript
INTER_NEAREST = 0    // Nearest neighbor interpolation
INTER_LINEAR = 1     // Bilinear interpolation
```

#### Threshold Types
```typescript
THRESH_BINARY = 0    // Binary thresholding
```

#### Contour Retrieval Modes
```typescript
RETR_EXTERNAL = 0    // External contours only
```

#### Contour Approximation Methods
```typescript
CHAIN_APPROX_SIMPLE = 0  // Simple chain approximation
```

#### Drawing Modes
```typescript
FILLED = -1          // Fill contours
```

#### Morphological Operation Types
```typescript
MORPH_RECT = 0       // Rectangular structuring element
MORPH_CLOSE = 1      // Morphological closing
```

### Image Processing Functions

#### `cvtColor(src: Mat, code: number): Mat`

Converts image between different color spaces.

```typescript
// BGR to RGB conversion
const rgb = cvtColor(bgrImage, COLOR_BGR2RGB);

// RGB to grayscale conversion
const gray = cvtColor(rgbImage, COLOR_RGB2GRAY);
```

#### `resize(src: Mat, dsize: Size, interpolation?: number): Mat`

Resizes an image.

```typescript
// Resize with bilinear interpolation (default)
const resized = resize(image, new Size(100, 100));

// Resize with nearest neighbor interpolation
const resized = resize(image, new Size(100, 100), INTER_NEAREST);
```

#### `copyMakeBorder(src: Mat, top: number, bottom: number, left: number, right: number, borderType: number, value?: Scalar): Mat`

Adds borders to an image.

```typescript
// Add 10-pixel border with black color
const bordered = copyMakeBorder(image, 10, 10, 10, 10, BORDER_CONSTANT, new Scalar(0, 0, 0));
```

#### `threshold(src: Mat, thresh: number, maxVal: number, type?: number): Mat`

Applies thresholding to an image.

```typescript
// Binary thresholding
const binary = threshold(image, 128, 255, THRESH_BINARY);
```

### Morphological Operations

#### `getStructuringElement(shape: number, ksize: Size): Mat`

Creates a structuring element for morphological operations.

```typescript
// Create 3x3 rectangular structuring element
const kernel = getStructuringElement(MORPH_RECT, new Size(3, 3));
```

#### `morphologyEx(src: Mat, op: number, kernel: Mat): Mat`

Performs morphological operations.

```typescript
// Morphological closing (dilate then erode)
const closed = morphologyEx(image, MORPH_CLOSE, kernel);
```

### Matrix Operations

#### `hconcat(mats: Mat[]): Mat`

Concatenates matrices horizontally.

```typescript
// Concatenate two images side by side
const combined = hconcat([image1, image2]);
```

#### `vconcat(mats: Mat[]): Mat`

Concatenates matrices vertically.

```typescript
// Concatenate two images top to bottom
const combined = vconcat([image1, image2]);
```

### Contour Operations

#### `findContours(binary: Mat, mode?: number, method?: number): Point[][]`

Finds contours in a binary image.

```typescript
// Find external contours
const contours = findContours(binaryImage, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);
```

#### `contourArea(contour: Point[]): number`

Calculates the area of a contour.

```typescript
const area = contourArea(contour);
```

#### `arcLength(contour: Point[], closed?: boolean): number`

Calculates the perimeter of a contour.

```typescript
const perimeter = arcLength(contour, true);
```

#### `approxPolyDP(contour: Point[], epsilon: number, closed?: boolean): Point[]`

Approximates a contour with fewer points.

```typescript
const simplified = approxPolyDP(contour, 0.5, true);
```

#### `drawContours(img: Mat, contours: Point[][], contourIdx: number, color: Scalar, thickness?: number): void`

Draws contours on an image.

```typescript
// Draw all contours in red
drawContours(image, contours, -1, new Scalar(255, 0, 0), 1);

// Fill contours in blue
drawContours(image, contours, -1, new Scalar(0, 0, 255), FILLED);
```

### Edge Detection (Optional)

#### `Canny(gray: Mat): Mat`

Performs Canny edge detection. Requires the `canny-edge-detector` package.

```typescript
// Install the optional dependency first
// npm install canny-edge-detector

const edges = Canny(grayImage);
```

## Usage Examples

### Basic Image Processing

```typescript
import { Mat, cvtColor, resize, threshold, findContours } from 'mini-cv-tensor';

// Load image data (example)
const imageData = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]);
const image = new Mat(new ort.Tensor("uint8", imageData, [1, 3, 3]));

// Convert to grayscale
const gray = cvtColor(image, COLOR_RGB2GRAY);

// Resize
const resized = resize(gray, new Size(100, 100));

// Threshold
const binary = threshold(resized, 128, 255, THRESH_BINARY);

// Find contours
const contours = findContours(binary);
```

### Matrix Operations

```typescript
import { Mat, hconcat, vconcat } from 'mini-cv-tensor';

// Create matrices
const mat1 = Mat.fromArray([[1, 2], [3, 4]], undefined, "float32");
const mat2 = Mat.fromArray([[5, 6], [7, 8]], undefined, "float32");

// Horizontal concatenation
const hCombined = hconcat([mat1, mat2]);
// Result: [[1, 2, 5, 6], [3, 4, 7, 8]]

// Vertical concatenation
const vCombined = vconcat([mat1, mat2]);
// Result: [[1, 2], [3, 4], [5, 6], [7, 8]]
```

### Contour Processing

```typescript
import { Mat, findContours, contourArea, arcLength, approxPolyDP } from 'mini-cv-tensor';

// Create binary image
const binary = Mat.fromArray([
  [0, 0, 0, 0, 0],
  [0, 255, 255, 255, 0],
  [0, 255, 255, 255, 0],
  [0, 255, 255, 255, 0],
  [0, 0, 0, 0, 0]
], undefined, "uint8");

// Find contours
const contours = findContours(binary);

// Process each contour
contours.forEach(contour => {
  const area = contourArea(contour);
  const perimeter = arcLength(contour, true);
  const simplified = approxPolyDP(contour, 0.5, true);
  
  console.log(`Area: ${area}, Perimeter: ${perimeter}, Points: ${simplified.length}`);
});
```

### ROI and Matrix Manipulation

```typescript
import { Mat, Rect } from 'mini-cv-tensor';

// Create source matrix
const src = Mat.fromArray([
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16]
], undefined, "float32");

// Extract ROI (region of interest)
const roi = src.roi(new Rect(1, 1, 2, 2));
// Result: [[6, 7], [10, 11]]

// Convert data type
const uint8Roi = roi.convertTo("uint8");

// Access data
const data = roi.data;
const firstRow = roi.floatPtr(0);
```

## Performance Considerations

- **Memory Management**: Mat objects wrap ONNX Runtime tensors. Large matrices should be properly managed to avoid memory leaks.
- **Data Types**: Use appropriate data types (`uint8` for images, `float32` for calculations) to optimize memory usage.
- **Batch Operations**: For multiple operations, consider batching them to reduce overhead.

## Limitations

- **Limited Function Set**: This library provides only essential OpenCV functions, not the complete OpenCV.js API.
- **Binary Operations**: Morphological operations currently support only binary (0/255) images.
- **Color Spaces**: Limited color space conversions (BGR↔RGB, RGB→GRAY).
- **Interpolation**: Resize supports only nearest neighbor and bilinear interpolation.

## Migration from OpenCV.js

This library is designed to be a drop-in replacement for common OpenCV.js operations:

```typescript
// OpenCV.js
import cv from '@techstark/opencv-js';
const mat = new cv.Mat(height, width, cv.CV_8UC3, imageData);
const gray = new cv.Mat();
cv.cvtColor(mat, gray, cv.COLOR_RGB2GRAY);

// Mini-OpenCV
import { Mat, cvtColor, COLOR_RGB2GRAY } from 'mini-cv-tensor';
const mat = new Mat(new ort.Tensor("uint8", imageData, [height, width, 3]));
const gray = cvtColor(mat, COLOR_RGB2GRAY);
```

## Bundle Size Comparison

| Library | Size | Features |
|---------|------|----------|
| OpenCV.js | ~9.89MB | Complete OpenCV functionality |
| Mini-OpenCV | ~0.5MB | Essential operations only |

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

MIT License - see LICENSE file for details.
