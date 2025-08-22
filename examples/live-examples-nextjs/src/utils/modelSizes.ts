export const MODEL_SIZES = {
  'wetland-segmentation': 45.5,
  'building-detection': 45.5,
  'car-detection': 45.5,
  'ship-detection': 45.5,
  'solar-panel-detection': 45.5,
  'land-cover-classification': 11.9,
  'oil-storage-tank-detection': 9.22,
  'oriented-object-detection': 73,
  'building-footprint-segmentation': 15.7,
  'object-detection': 104,
  'mask-generation': 40,
  'zero-shot-object-detection': 204,
  'zero-shot-segmentation': 50,
  'image-feature-extraction': 50,
  'embedding-similarity-search': 24,
} as const;

export type TaskType = keyof typeof MODEL_SIZES;

export function getModelSize(task: TaskType): number {
  return MODEL_SIZES[task] || 50; // Default fallback
}
