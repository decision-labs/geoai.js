import type { ProviderParams, WmsParams } from 'geoai';
import type { StyleSpecification } from 'maplibre-gl';

export const WMS_SOURCE_ID = 'wms-tiles';
export const WMS_LAYER_ID = 'wms-tiles-layer';

export type QuickstartTask = 'building-detection' | 'car-detection' | 'object-detection';

export const SUPPORTED_TASKS: QuickstartTask[] = [
  'building-detection',
  'car-detection',
  'object-detection',
];

/** Recommended inference zoom per task on NRW 10 cm orthophotos. */
export const TASK_INFERENCE_ZOOM: Record<QuickstartTask, number> = {
  'building-detection': 17,
  'car-detection': 20,
  'object-detection': 18,
};

/** GeoAI pipeline task — car UI uses object-detection bboxes (LightVehicle, etc.). */
export function getPipelineTask(task: QuickstartTask): QuickstartTask | 'object-detection' {
  if (task === 'car-detection') {
    return 'object-detection';
  }
  return task;
}

export const VEHICLE_DETECTION_LABELS = new Set(['LightVehicle', 'Truck', 'Bus', 'Bike']);

export function getPostProcessingParams(
  task: QuickstartTask,
): { confidence: number } | undefined {
  if (task === 'car-detection' || task === 'object-detection') {
    return { confidence: 0.35 };
  }
  return undefined;
}

export function prepareDetectionsForDisplay(
  task: QuickstartTask,
  detections: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  const features =
    task === 'car-detection'
      ? detections.features.filter((feature) => {
          const label = feature.properties?.label;
          return typeof label === 'string' && VEHICLE_DETECTION_LABELS.has(label);
        })
      : detections.features;

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function getInferenceZoomForTask(task: QuickstartTask): number {
  return TASK_INFERENCE_ZOOM[task];
}

export type WmsPresetId = 'nrw-dop' | 'custom';

export type WmsPreset = {
  id: WmsPresetId;
  label: string;
  baseUrl: string;
  layers: string;
  attribution: string;
  mapCenter: [number, number];
  inferenceZoom: number;
};

/** Geobasis NRW digital orthophotos — public OGC WMS. */
export const NRW_DOP_WMS_URL = 'https://www.wms.nrw.de/geobasis/wms_nw_dop';

/** RGB orthophoto sublayer — parent `WMS_NW_DOP` defaults to NIR (grayscale). */
export const NRW_DOP_LAYER = 'nw_dop_rgb';

export const WMS_PRESETS: Record<'nrw-dop', WmsPreset> = {
  'nrw-dop': {
    id: 'nrw-dop',
    label: 'NRW DOP orthophotos (Geobasis NRW)',
    baseUrl: NRW_DOP_WMS_URL,
    layers: NRW_DOP_LAYER,
    attribution: '© Geobasis NRW / Bezirksregierung Köln (Digitale Orthophotos)',
    mapCenter: [6.958, 50.941],
    inferenceZoom: 17,
  },
};

export type WmsQuickstartConfig = {
  providerParams: WmsParams;
  mapTiles: string[];
  mapCenter: [number, number];
  inferenceZoom: number;
  task: QuickstartTask;
  presetId: WmsPresetId;
};

function parseMapCenter(value: string | undefined, fallback: [number, number]): [number, number] {
  if (!value) {
    return fallback;
  }

  const [lng, lat] = value.split(',').map((part) => Number(part.trim()));
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return fallback;
  }

  return [lng, lat];
}

function parseTask(value: string | undefined): QuickstartTask {
  if (value && SUPPORTED_TASKS.includes(value as QuickstartTask)) {
    return value as QuickstartTask;
  }

  return 'building-detection';
}

function parseInferenceZoom(value: string | undefined, fallback: number): number {
  const zoom = Number(value);
  return Number.isFinite(zoom) ? zoom : fallback;
}

function resolvePresetFromEnv(baseUrl: string, layers: string): WmsPresetId {
  if (baseUrl === WMS_PRESETS['nrw-dop'].baseUrl && layers === WMS_PRESETS['nrw-dop'].layers) {
    return 'nrw-dop';
  }
  return 'custom';
}

/**
 * MapLibre raster WMS URL per https://maplibre.org/maplibre-gl-js/docs/examples/add-a-wms-source/
 * Keep `{bbox-epsg-3857}` literal — MapLibre replaces it per tile (do not URL-encode).
 */
export function buildWmsMapTileUrl(
  params: Pick<WmsParams, 'baseUrl' | 'layers' | 'version' | 'crs' | 'format' | 'styles' | 'tileSize'>,
): string {
  const version = params.version ?? '1.3.0';
  const crs = params.crs ?? 'EPSG:3857';
  const format = params.format ?? 'image/png';
  const styles = params.styles ?? '';
  const tileSize = params.tileSize ?? 256;
  const crsParam = version === '1.3.0' ? 'CRS' : 'SRS';
  const bboxParam = version === '1.3.0' ? 'BBOX' : 'bbox';

  // Same pattern as https://maplibre.org/maplibre-gl-js/docs/examples/add-a-wms-source/
  // Keep `{bbox-epsg-3857}` literal — MapLibre substitutes per tile (never URL-encode it).
  return (
    `${params.baseUrl}?SERVICE=WMS&REQUEST=GetMap&VERSION=${version}` +
    `&LAYERS=${encodeURIComponent(params.layers)}` +
    `&STYLES=${encodeURIComponent(styles)}` +
    `&FORMAT=${encodeURIComponent(format)}` +
    `&WIDTH=${tileSize}&HEIGHT=${tileSize}` +
    `&${crsParam}=${encodeURIComponent(crs)}` +
    `&${bboxParam}={bbox-epsg-3857}`
  );
}

/** MapLibre style with inline WMS raster source (official add-a-wms-source pattern). */
export function buildMapStyle(config: WmsQuickstartConfig): StyleSpecification {
  return {
    version: 8,
    sources: {
      [WMS_SOURCE_ID]: {
        type: 'raster',
        tiles: config.mapTiles,
        tileSize: config.providerParams.tileSize ?? 256,
        attribution: config.providerParams.attribution,
      },
    },
    layers: [
      {
        id: WMS_LAYER_ID,
        type: 'raster',
        source: WMS_SOURCE_ID,
      },
    ],
  };
}

export function buildWmsConfig(overrides?: {
  baseUrl?: string;
  layers?: string;
  version?: WmsParams['version'];
  crs?: WmsParams['crs'];
  format?: string;
  attribution?: string;
  task?: QuickstartTask;
  mapCenter?: [number, number];
  inferenceZoom?: number;
  presetId?: WmsPresetId;
}): WmsQuickstartConfig {
  const defaultPreset = WMS_PRESETS['nrw-dop'];
  const envBaseUrl = import.meta.env.VITE_WMS_BASE_URL;
  const envLayers = import.meta.env.VITE_WMS_LAYERS;
  const baseUrl = overrides?.baseUrl?.trim() || envBaseUrl || defaultPreset.baseUrl;
  const layers = overrides?.layers?.trim() || envLayers || defaultPreset.layers;
  const presetId =
    overrides?.presetId ||
    (envBaseUrl || envLayers ? resolvePresetFromEnv(baseUrl, layers) : 'nrw-dop');
  const preset = presetId === 'custom' ? null : WMS_PRESETS['nrw-dop'];

  const version: WmsParams['version'] =
    overrides?.version ||
    (import.meta.env.VITE_WMS_VERSION === '1.1.1' ? '1.1.1' : '1.3.0');
  const crs: WmsParams['crs'] =
    overrides?.crs ||
    (import.meta.env.VITE_WMS_CRS === 'EPSG:4326' ? 'EPSG:4326' : 'EPSG:3857');
  const format = overrides?.format || import.meta.env.VITE_WMS_FORMAT || 'image/png';
  const attribution =
    overrides?.attribution ||
    import.meta.env.VITE_WMS_ATTRIBUTION ||
    preset?.attribution ||
    defaultPreset.attribution;
  const task = overrides?.task || parseTask(import.meta.env.VITE_GEOAI_TASK);
  const taskInferenceZoom = getInferenceZoomForTask(task);
  const mapCenter =
    overrides?.mapCenter ||
    parseMapCenter(import.meta.env.VITE_MAP_CENTER, preset?.mapCenter ?? defaultPreset.mapCenter);
  const inferenceZoom =
    overrides?.inferenceZoom ??
    parseInferenceZoom(import.meta.env.VITE_INFERENCE_ZOOM, taskInferenceZoom);

  const providerParams: WmsParams = {
    provider: 'wms',
    baseUrl,
    layers,
    version,
    crs,
    format,
    attribution,
    tileSize: 256,
  };

  return {
    providerParams,
    mapTiles: [buildWmsMapTileUrl(providerParams)],
    mapCenter,
    inferenceZoom,
    task,
    presetId: presetId === 'custom' ? 'custom' : presetId,
  };
}

export function toProviderParams(config: WmsQuickstartConfig): ProviderParams {
  return config.providerParams;
}

export function formatTaskLabel(task: QuickstartTask): string {
  return task
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
