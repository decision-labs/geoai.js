declare module 'canny-edge-detector' {
  interface ImageData {
    data: Uint8Array;
    width: number;
    height: number;
  }

  interface CannyOptions {
    lowThreshold?: number;
    highThreshold?: number;
    gaussianBlur?: number;
  }

  function cannyEdgeDetector(image: ImageData, options?: CannyOptions): ImageData;
  
  export default cannyEdgeDetector;
}
