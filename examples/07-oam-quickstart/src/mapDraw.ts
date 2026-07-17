import type maplibregl from 'maplibre-gl';

/** Insert raster tiles below draw layers so polygon strokes stay visible. */
export function getImageryBeforeLayerId(map: maplibregl.Map): string | undefined {
  if (map.getLayer('detections-fill')) {
    return 'detections-fill';
  }

  const firstDrawLayer = map.getStyle().layers?.find((layer) => layer.id.startsWith('gl-draw-'));
  return firstDrawLayer?.id;
}

export function ensureDrawLayersOnTop(map: maplibregl.Map): void {
  const drawLayerIds =
    map
      .getStyle()
      .layers?.map((layer) => layer.id)
      .filter((id) => id.startsWith('gl-draw-')) ?? [];

  for (const layerId of drawLayerIds) {
    if (map.getLayer(layerId)) {
      map.moveLayer(layerId);
    }
  }
}
