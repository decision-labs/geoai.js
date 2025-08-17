import type { GPUInfo } from './gpuUtils';

/**
 * MapLibre-specific utility functions for styling and expressions
 */

/**
 * Gets the optimal color scheme based on GPU capabilities
 * @param gpuInfo - GPU information from detectGPU()
 * @returns Color scheme configuration for visualization
 */
export function getOptimalColorScheme(gpuInfo: GPUInfo) {
  if (gpuInfo.hasWebGPU) {
    // WebGPU: Use ultra-rich color gradient with more stops
    return {
      hovered: '#fcfdbf', // Bright yellow-white
      low: '#000004',     // Black
      lowMedium: '#3b0f70', // Dark purple
      medium: '#8c2981',  // Purple
      mediumHigh: '#de4968', // Pink-red
      high: '#fe9f6d',    // Orange
      highest: '#fcfdbf'  // Bright yellow-white
    };
  } else if (gpuInfo.isHighPerformance) {
    // High-performance WebGL GPU: Use rich color gradient
    return {
      hovered: '#fcfdbf', // Bright yellow-white
      low: '#000004',     // Black
      medium: '#8c2981',  // Purple
      high: '#fcfdbf'     // Bright yellow-white
    };
  } else {
    // Low-performance GPU: Use simple black/white
    return {
      hovered: '#ffffff', // White
      low: '#000000',     // Black
      medium: '#ffffff',  // White (not used in 2-stop interpolation)
      high: '#ffffff'     // White
    };
  }
}

/**
 * Creates MapLibre color expression based on GPU capabilities
 * @param gpuInfo - GPU information from detectGPU()
 * @param hoveredPatchIndex - Index of currently hovered patch
 * @returns MapLibre color expression array
 */
export function createColorExpression(
  gpuInfo: GPUInfo,
  hoveredPatchIndex: number
) {
  if (gpuInfo.hasWebGPU) {
    // WebGPU: 6-color gradient for maximum visual detail
    return [
      'case',
      ['==', ['get', 'patchIndex'], hoveredPatchIndex], '#fcfdbf', // Bright yellow-white
      ['interpolate', ['linear'], 
        ['at', hoveredPatchIndex, ['get', 'similarities']], // Array indexing
        0, '#000004',   // Black
        0.2, '#3b0f70', // Dark purple
        0.4, '#8c2981', // Purple
        0.6, '#de4968', // Pink-red
        0.8, '#fe9f6d', // Orange
        1, '#fcfdbf'    // Bright yellow-white
      ]
    ];
  } else if (gpuInfo.isHighPerformance) {
    // High-performance WebGL: 3-color gradient
    return [
      'case',
      ['==', ['get', 'patchIndex'], hoveredPatchIndex], '#fcfdbf', // Bright yellow-white
      ['interpolate', ['linear'], 
        ['at', hoveredPatchIndex, ['get', 'similarities']], // Array indexing
        0, '#000004',   // Black
        0.5, '#8c2981', // Purple
        1, '#fcfdbf'    // Bright yellow-white
      ]
    ];
  } else {
    // Low-performance: 2-color gradient for maximum performance
    return [
      'case',
      ['==', ['get', 'patchIndex'], hoveredPatchIndex], '#ffffff', // White
      ['interpolate', ['linear'], 
        ['at', hoveredPatchIndex, ['get', 'similarities']], // Array indexing
        0, '#000000',   // Black
        1, '#ffffff'    // White
      ]
    ];
  }
}

/**
 * Creates MapLibre opacity expression for similarity visualization
 * @param hoveredPatchIndex - Index of currently hovered patch
 * @returns MapLibre opacity expression array
 */
export function createOpacityExpression(
  hoveredPatchIndex: number
) {
  return [
    'case',
    ['==', ['get', 'patchIndex'], hoveredPatchIndex], 1, // Hovered patch = fully opaque
    ['interpolate', ['linear'], 
      ['at', hoveredPatchIndex, ['get', 'similarities']], // Array indexing
      0, 0.3,  // Lower opacity for low similarity
      1, 0.8   // Higher opacity for high similarity
    ]
  ];
}
