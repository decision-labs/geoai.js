import type maplibregl from 'maplibre-gl';

export const DETECTIONS_SOURCE_ID = 'detections';
export const DETECTIONS_FILL_LAYER_ID = 'detections-fill';
export const DETECTIONS_OUTLINE_LAYER_ID = 'detections-outline';
export const INFERENCE_BOUNDS_SOURCE_ID = 'inference-bounds';
export const INFERENCE_BOUNDS_LAYER_ID = 'inference-bounds-layer';

/** Insert raster tiles below draw layers so polygon strokes stay visible. */
export function getImageryBeforeLayerId(map: maplibregl.Map): string | undefined {
  if (map.getLayer(DETECTIONS_FILL_LAYER_ID)) {
    return DETECTIONS_FILL_LAYER_ID;
  }

  const firstDrawLayer = map.getStyle().layers?.find((layer) => layer.id.startsWith('gl-draw-'));
  return firstDrawLayer?.id;
}

function getDrawLayerIds(map: maplibregl.Map): string[] {
  return (
    map
      .getStyle()
      .layers?.map((layer) => layer.id)
      .filter((id) => id.startsWith('gl-draw-')) ?? []
  );
}

/** Keep draw handles and outlines above imagery; fill can sit below detection overlays. */
export function ensureDrawLayersOnTop(map: maplibregl.Map): void {
  for (const layerId of getDrawLayerIds(map)) {
    if (map.getLayer(layerId)) {
      map.moveLayer(layerId);
    }
  }
}

function hasRenderableCoordinates(geometry: GeoJSON.Geometry | undefined): boolean {
  if (!geometry) {
    return false;
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates.some((ring) => ring.length >= 4);
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon) =>
      polygon.some((ring) => ring.length >= 4),
    );
  }

  return false;
}

/** Drop mask features with empty contours — car-detection can return these on WMS tiles. */
export function filterRenderableFeatures(features: GeoJSON.Feature[]): GeoJSON.Feature[] {
  return features.filter((feature) => hasRenderableCoordinates(feature.geometry));
}

/**
 * Draw polygon fill sits above detection boxes by default and hides small car bboxes.
 * Raise detection overlays above draw fills, but keep draw strokes/vertices on top.
 */
export function elevateDetectionLayers(map: maplibregl.Map): void {
  if (!map.getLayer(DETECTIONS_FILL_LAYER_ID)) {
    return;
  }

  map.moveLayer(DETECTIONS_FILL_LAYER_ID);
  map.moveLayer(DETECTIONS_OUTLINE_LAYER_ID);

  for (const layerId of getDrawLayerIds(map)) {
    if (!layerId.includes('fill') && map.getLayer(layerId)) {
      map.moveLayer(layerId);
    }
  }
}

export function clearInferenceBounds(map: maplibregl.Map): void {
  if (!map.getSource(INFERENCE_BOUNDS_SOURCE_ID)) {
    return;
  }

  if (map.getLayer(INFERENCE_BOUNDS_LAYER_ID)) {
    map.removeLayer(INFERENCE_BOUNDS_LAYER_ID);
  }
  map.removeSource(INFERENCE_BOUNDS_SOURCE_ID);
}

export function displayInferenceBounds(
  map: maplibregl.Map,
  bounds: { north: number; south: number; east: number; west: number },
): void {
  clearInferenceBounds(map);

  const boundsPolygon: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: 'Feature',
    properties: { type: 'inference-area' },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [bounds.west, bounds.north],
          [bounds.east, bounds.north],
          [bounds.east, bounds.south],
          [bounds.west, bounds.south],
          [bounds.west, bounds.north],
        ],
      ],
    },
  };

  map.addSource(INFERENCE_BOUNDS_SOURCE_ID, {
    type: 'geojson',
    data: boundsPolygon,
  });

  map.addLayer({
    id: INFERENCE_BOUNDS_LAYER_ID,
    type: 'line',
    source: INFERENCE_BOUNDS_SOURCE_ID,
    paint: {
      'line-color': '#8b5cf6',
      'line-width': 2,
      'line-dasharray': [4, 2],
    },
  });

  if (map.getLayer(DETECTIONS_FILL_LAYER_ID)) {
    map.moveLayer(INFERENCE_BOUNDS_LAYER_ID, DETECTIONS_FILL_LAYER_ID);
  }
}

export function clearDetections(map: maplibregl.Map): void {
  if (!map.getSource(DETECTIONS_SOURCE_ID)) {
    return;
  }

  if (map.getLayer(DETECTIONS_FILL_LAYER_ID)) {
    map.removeLayer(DETECTIONS_FILL_LAYER_ID);
  }
  if (map.getLayer(DETECTIONS_OUTLINE_LAYER_ID)) {
    map.removeLayer(DETECTIONS_OUTLINE_LAYER_ID);
  }
  map.removeSource(DETECTIONS_SOURCE_ID);
}

export function displayDetections(
  map: maplibregl.Map,
  detections: GeoJSON.FeatureCollection,
): number {
  const renderableFeatures = filterRenderableFeatures(detections.features);
  clearDetections(map);

  if (renderableFeatures.length === 0) {
    return 0;
  }

  const renderableCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: renderableFeatures,
  };

  map.addSource(DETECTIONS_SOURCE_ID, {
    type: 'geojson',
    data: renderableCollection,
  });

  map.addLayer({
    id: DETECTIONS_FILL_LAYER_ID,
    type: 'fill',
    source: DETECTIONS_SOURCE_ID,
    paint: {
      'fill-color': '#ff6b35',
      'fill-opacity': 0.45,
    },
  });

  map.addLayer({
    id: DETECTIONS_OUTLINE_LAYER_ID,
    type: 'line',
    source: DETECTIONS_SOURCE_ID,
    paint: {
      'line-color': '#cc5500',
      'line-width': 3,
    },
  });

  elevateDetectionLayers(map);
  return renderableFeatures.length;
}
