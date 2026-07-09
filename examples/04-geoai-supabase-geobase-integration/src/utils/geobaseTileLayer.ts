import type { FillLayerSpecification, Map } from 'maplibre-gl';

export const DETECTION_RESULTS_LAYER_ID = 'detection-results-layer';
export const GEOBASE_TILE_SOURCE_ID = 'geobase_tile_source';
export const GEOBASE_TILE_SOURCE_LAYER = 'public.aidx_results';

export const detectionResultsLayerPaint: FillLayerSpecification['paint'] = {
  'fill-color': [
    'case',
    ['==', ['get', 'task_type'], 'land-cover-classification'], [
      'case',
      ['==', ['get', 'class'], 'developed space'], '#8B4513',
      ['==', ['get', 'class'], 'vegetation'], '#228B22',
      ['==', ['get', 'class'], 'water'], '#4169E1',
      ['==', ['get', 'class'], 'bare soil'], '#D2B48C',
      ['==', ['get', 'class'], 'urban'], '#696969',
      ['==', ['get', 'class'], 'agricultural'], '#9ACD32',
      ['==', ['get', 'class'], 'forest'], '#006400',
      ['==', ['get', 'class'], 'grassland'], '#90EE90',
      '#ff9ff3',
    ],
    ['==', ['get', 'task_type'], 'oil-storage-tank-detection'], '#ff6b6b',
    ['==', ['get', 'task_type'], 'solar-panel-detection'], '#4ecdc4',
    ['==', ['get', 'task_type'], 'building-detection'], '#45b7d1',
    ['==', ['get', 'task_type'], 'car-detection'], '#96ceb4',
    ['==', ['get', 'task_type'], 'ship-detection'], '#feca57',
    '#ff9ff3',
  ],
  'fill-opacity': 0.6,
  'fill-outline-color': '#ffffff',
};

export function getGeobaseProjectRef(supabaseUrl?: string): string | null {
  if (!supabaseUrl) return null;
  const match = supabaseUrl.match(/^https:\/\/([^.]+)\.geobase\.app/);
  return match?.[1] ?? null;
}

export function buildGeobaseTileUrl(projectRef: string, apiKey: string, cacheBuster?: number): string {
  const query = new URLSearchParams({ apikey: apiKey });
  if (cacheBuster !== undefined) {
    query.set('t', String(cacheBuster));
  }
  return `https://${projectRef}.geobase.app/tileserver/v1/public.aidx_results/{z}/{x}/{y}.pbf?${query.toString()}`;
}

export function addDetectionResultsLayer(mapInstance: Map): void {
  if (mapInstance.getLayer(DETECTION_RESULTS_LAYER_ID)) return;

  mapInstance.addLayer({
    id: DETECTION_RESULTS_LAYER_ID,
    type: 'fill',
    source: GEOBASE_TILE_SOURCE_ID,
    'source-layer': GEOBASE_TILE_SOURCE_LAYER,
    paint: detectionResultsLayerPaint,
    filter: ['==', '$type', 'Polygon'],
  });
}
