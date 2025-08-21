import type { GPUInfo } from './gpuUtils';

/**
 * MapLibre-specific utility functions for styling and expressions
 */

/**
 * Gets the color scheme for visualization (same regardless of GPU)
 * @param gpuInfo - GPU information from detectGPU() (unused for now)
 * @returns Color scheme configuration for visualization
 */
export function getOptimalColorScheme(gpuInfo: GPUInfo) {
  // Use consistent color scheme regardless of GPU capabilities
  return {
    hovered: '#fcfdbf', // Bright yellow-white
    low: '#000004',     // Black
    lowMedium: '#3b0f70', // Dark purple
    medium: '#8c2981',  // Purple
    mediumHigh: '#de4968', // Pink-red
    high: '#fe9f6d',    // Orange
    highest: '#fcfdbf'  // Bright yellow-white
  };
}

/**
 * Creates MapLibre color expression (same regardless of GPU)
 * @param gpuInfo - GPU information from detectGPU() (unused for now)
 * @param hoveredPatchIndex - Index of currently hovered patch
 * @returns MapLibre color expression array
 */
export function createColorExpression(
  gpuInfo: GPUInfo,
  hoveredPatchIndex: number
) {
  // Use consistent 6-color gradient regardless of GPU capabilities
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
