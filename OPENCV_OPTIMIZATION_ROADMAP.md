# OpenCV.js Optimization Roadmap

## Current Situation

The `@techstark/opencv-js` library is currently **9.89MB** (98.79% of bundle size) and is being imported as a monolithic library, despite only using a small subset of its functions. This significantly impacts bundle size and loading performance.

## OpenCV Functions Currently Used

### Core Mat Operations
- `cv.Mat()` - Creating matrices
- `cv.matFromArray()` - Creating matrices from arrays  
- `cv.MatVector()` - Creating vectors of matrices
- `cv.Mat.zeros()` - Creating zero matrices
- `cv.Mat.ones()` - Creating matrices filled with ones
- `cv.Scalar()` - Creating scalar values
- `cv.Size()` - Creating size objects
- `cv.Rect()` - Creating rectangle objects
- `cv.Point()` - Creating point objects

### Image Processing
- `cv.cvtColor()` - Color space conversion (BGR2RGB, RGB2GRAY)
- `cv.resize()` - Image resizing
- `cv.copyMakeBorder()` - Adding borders to images
- `cv.threshold()` - Image thresholding
- `cv.Canny()` - Edge detection

### Contour Operations
- `cv.findContours()` - Finding contours in binary images
- `cv.contourArea()` - Calculating contour areas
- `cv.arcLength()` - Calculating contour perimeter
- `cv.approxPolyDP()` - Approximating contours
- `cv.drawContours()` - Drawing contours

### Morphological Operations
- `cv.getStructuringElement()` - Creating structuring elements
- `cv.morphologyEx()` - Morphological operations (closing)

### Matrix Operations
- `cv.hconcat()` - Horizontal concatenation
- `cv.vconcat()` - Vertical concatenation
- `mat.convertTo()` - Converting matrix types
- `mat.roi()` - Region of interest
- `mat.copyTo()` - Copying matrices
- `mat.data` - Accessing matrix data
- `mat.floatPtr()` - Accessing float pointers
- `mat.ucharPtr()` - Accessing unsigned char pointers

### Constants
- `cv.CV_8UC1`, `cv.CV_8UC3`, `cv.CV_8UC4` - Matrix types
- `cv.CV_32F`, `cv.CV_8U` - Matrix types
- `cv.COLOR_BGR2RGB`, `cv.COLOR_RGB2GRAY` - Color conversion codes
- `cv.BORDER_CONSTANT` - Border type
- `cv.INTER_LINEAR`, `cv.INTER_NEAREST` - Interpolation methods
- `cv.THRESH_BINARY` - Threshold type
- `cv.RETR_EXTERNAL` - Contour retrieval mode
- `cv.CHAIN_APPROX_SIMPLE` - Contour approximation method
- `cv.FILLED` - Contour drawing mode
- `cv.MORPH_RECT`, `cv.MORPH_CLOSE` - Morphological operation types

## Files Using OpenCV

1. **`src/models/building_footprint_segmentation.ts`** - Heavy usage for image preprocessing and post-processing
2. **`src/models/land_cover_classification.ts`** - Basic image resizing and conversion
3. **`src/models/oil_storage_tank_detection.ts`** - Basic image resizing and conversion
4. **`src/data_providers/common.ts`** - Image stitching operations
5. **`src/utils/utils.ts`** - Contour detection and morphological operations

## Optimization Roadmap

### Phase 1: Immediate Wins (Estimated 60-70% bundle reduction)

#### 1.1 Replace Simple Operations with Native APIs
- **Image Resizing**: Replace `cv.resize()` with Canvas API
- **Color Space Conversion**: Implement manual BGR↔RGB conversion
- **Basic Matrix Operations**: Use TypedArrays for simple operations
- **Image Stitching**: Use Canvas API for concatenation operations

#### 1.2 Implement Pure JavaScript Alternatives
```typescript
// Example: Replace cv.resize() with Canvas
function resizeImage(imageData: Uint8Array, width: number, height: number, newWidth: number, newHeight: number): Uint8Array {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const imageDataObj = new ImageData(new Uint8ClampedArray(imageData), width, height);
  canvas.width = newWidth;
  canvas.height = newHeight;
  ctx.putImageData(imageDataObj, 0, 0);
  const resizedImageData = ctx.getImageData(0, 0, newWidth, newHeight);
  return new Uint8Array(resizedImageData.data);
}

// Example: Manual color conversion
function bgrToRgb(bgrData: Uint8Array): Uint8Array {
  const rgbData = new Uint8Array(bgrData.length);
  for (let i = 0; i < bgrData.length; i += 3) {
    rgbData[i] = bgrData[i + 2];     // R
    rgbData[i + 1] = bgrData[i + 1]; // G  
    rgbData[i + 2] = bgrData[i];     // B
  }
  return rgbData;
}
```

### Phase 2: Advanced Replacements (Estimated 80-90% bundle reduction)

#### 2.1 Replace Contour Detection
- **Marching Squares Algorithm**: Implement for contour extraction
- **Custom Contour Approximation**: Replace `cv.approxPolyDP()`
- **Area Calculation**: Simple polygon area calculation

#### 2.2 Replace Morphological Operations
- **Basic Erosion/Dilation**: Implement with sliding window
- **Structuring Elements**: Pre-compute common kernels
- **Closing Operations**: Combine erosion and dilation

#### 2.3 Replace Edge Detection
- **Sobel Operator**: Implement gradient-based edge detection
- **Canny Alternative**: Use simpler edge detection algorithms

### Phase 3: Custom OpenCV.js Build (Estimated 95%+ bundle reduction)

#### 3.1 Build Custom OpenCV.js
```bash
# Clone OpenCV.js repository
git clone https://github.com/opencv/opencv_js.git
cd opencv_js

# Configure build with only needed modules
cmake -DOPENCV_JS_MODULES="core,imgproc" \
      -DOPENCV_JS_FUNCTIONS="matFromArray,cvtColor,resize,threshold,findContours,contourArea,arcLength,approxPolyDP,drawContours,getStructuringElement,morphologyEx,hconcat,vconcat,Canny" \
      -DOPENCV_JS_TYPES="CV_8UC1,CV_8UC3,CV_8UC4,CV_32F,CV_8U" \
      -DOPENCV_JS_CONSTANTS="COLOR_BGR2RGB,COLOR_RGB2GRAY,BORDER_CONSTANT,INTER_LINEAR,INTER_NEAREST,THRESH_BINARY,RETR_EXTERNAL,CHAIN_APPROX_SIMPLE,FILLED,MORPH_RECT,MORPH_CLOSE" \
      ..

# Build the custom version
make -j$(nproc)
```

#### 3.2 Alternative: Use OpenCV.js Builder
```bash
# Use the official OpenCV.js builder
docker run --rm -v $(pwd):/src opencv/opencv-js-builder:latest \
  --modules core,imgproc \
  --functions matFromArray,cvtColor,resize,threshold,findContours,contourArea,arcLength,approxPolyDP,drawContours,getStructuringElement,morphologyEx,hconcat,vconcat,Canny \
  --output opencv-custom.js
```

### Phase 4: Dynamic Loading (Optional)

#### 4.1 Implement Lazy Loading
```typescript
// Only load OpenCV when needed
let cv: any = null;

async function loadOpenCV() {
  if (!cv) {
    cv = await import('@techstark/opencv-js');
  }
  return cv;
}

// Use in functions
async function processImage(imageData: Uint8Array) {
  const opencv = await loadOpenCV();
  const mat = opencv.matFromArray(height, width, opencv.CV_8UC3, imageData);
  // ... rest of processing
}
```

## Implementation Priority

### High Priority (Phase 1)
1. **Image Resizing** - Used in 3 files, easy to replace
2. **Color Conversion** - Simple manual implementation
3. **Basic Matrix Operations** - TypedArray alternatives
4. **Image Stitching** - Canvas API replacement

### Medium Priority (Phase 2)
1. **Contour Detection** - Marching squares implementation
2. **Morphological Operations** - Custom implementations
3. **Edge Detection** - Sobel operator replacement

### Low Priority (Phase 3)
1. **Custom OpenCV.js Build** - Requires build infrastructure
2. **Dynamic Loading** - Adds complexity

## Expected Bundle Size Reduction

| Phase | Current Size | Target Size | Reduction |
|-------|-------------|-------------|-----------|
| Phase 1 | 9.89MB | ~3-4MB | 60-70% |
| Phase 2 | 3-4MB | ~1-2MB | 80-90% |
| Phase 3 | 1-2MB | ~0.5MB | 95%+ |

## Testing Strategy

1. **Unit Tests**: Create tests for each replacement function
2. **Integration Tests**: Verify end-to-end functionality
3. **Performance Tests**: Ensure replacements don't degrade performance
4. **Visual Regression Tests**: Compare output images

## Migration Plan

1. **Week 1-2**: Implement Phase 1 replacements
2. **Week 3-4**: Implement Phase 2 replacements  
3. **Week 5-6**: Build and test custom OpenCV.js
4. **Week 7**: Performance optimization and testing
5. **Week 8**: Documentation and cleanup

## Resources

- [OpenCV.js Documentation](https://docs.opencv.org/4.8.0/d5/d10/tutorial_js_root.html)
- [Canvas API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Marching Squares Algorithm](https://en.wikipedia.org/wiki/Marching_squares)
- [OpenCV.js Builder](https://github.com/opencv/opencv_js)

## Notes

- All replacements should maintain the same API interface
- Performance should be monitored throughout the migration
- Fallback to original OpenCV.js should be available during transition
- Consider using Web Workers for heavy computations
