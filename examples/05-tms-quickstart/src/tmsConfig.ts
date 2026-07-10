import type { ProviderParams, TmsParams } from 'geoai';

export type QuickstartTask = 'building-detection' | 'car-detection' | 'object-detection';

export const SUPPORTED_TASKS: QuickstartTask[] = [
  'building-detection',
  'car-detection',
  'object-detection',
];

export type TilePresetId = 'esri-world-imagery' | 'custom';

export type TilePreset = {
  id: TilePresetId;
  label: string;
  baseUrl: string;
  attribution: string;
  mapCenter: [number, number];
  inferenceZoom: number;
};

/** ESRI uses `{z}/{y}/{x}` in the path — not the more common `{z}/{x}/{y}`. */
export const ESRI_WORLD_IMAGERY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const TILE_PRESETS: Record<'esri-world-imagery', TilePreset> = {
  'esri-world-imagery': {
    id: 'esri-world-imagery',
    label: 'ESRI World Imagery (satellite)',
    baseUrl: ESRI_WORLD_IMAGERY_URL,
    attribution: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    mapCenter: [12.482, 41.885],
    inferenceZoom: 17,
  },
};

export type TmsQuickstartConfig = {
  providerParams: TmsParams;
  mapTiles: string[];
  mapCenter: [number, number];
  inferenceZoom: number;
  task: QuickstartTask;
  presetId: TilePresetId;
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

function resolvePresetFromEnv(baseUrl: string): TilePresetId {
  if (baseUrl === TILE_PRESETS['esri-world-imagery'].baseUrl) {
    return 'esri-world-imagery';
  }
  return 'custom';
}

export function buildTmsConfig(overrides?: {
  baseUrl?: string;
  scheme?: TmsParams['scheme'];
  attribution?: string;
  extension?: string;
  apiKey?: string;
  task?: QuickstartTask;
  mapCenter?: [number, number];
  inferenceZoom?: number;
  presetId?: TilePresetId;
}): TmsQuickstartConfig {
  const defaultPreset = TILE_PRESETS['esri-world-imagery'];
  const envBaseUrl = import.meta.env.VITE_TMS_BASE_URL;
  const baseUrl = overrides?.baseUrl?.trim() || envBaseUrl || defaultPreset.baseUrl;
  const presetId =
    overrides?.presetId ||
    (envBaseUrl ? resolvePresetFromEnv(baseUrl) : 'esri-world-imagery');
  const preset =
    presetId === 'custom' ? null : TILE_PRESETS['esri-world-imagery'];

  const scheme: TmsParams['scheme'] =
    overrides?.scheme ||
    (import.meta.env.VITE_TMS_SCHEME === 'TMS' ? 'TMS' : 'WebMercator');
  const attribution =
    overrides?.attribution ||
    import.meta.env.VITE_TMS_ATTRIBUTION ||
    preset?.attribution ||
    defaultPreset.attribution;
  const extension = overrides?.extension || import.meta.env.VITE_TMS_EXTENSION;
  const apiKey = overrides?.apiKey || import.meta.env.VITE_TMS_API_KEY;
  const task = overrides?.task || parseTask(import.meta.env.VITE_GEOAI_TASK);
  const mapCenter =
    overrides?.mapCenter ||
    parseMapCenter(import.meta.env.VITE_MAP_CENTER, preset?.mapCenter ?? defaultPreset.mapCenter);
  const inferenceZoom =
    overrides?.inferenceZoom ??
    parseInferenceZoom(import.meta.env.VITE_INFERENCE_ZOOM, preset?.inferenceZoom ?? defaultPreset.inferenceZoom);

  const providerParams: TmsParams = {
    provider: 'tms',
    baseUrl,
    scheme,
    attribution,
    tileSize: 256,
    ...(extension ? { extension } : {}),
    ...(apiKey ? { apiKey } : {}),
  };

  return {
    providerParams,
    mapTiles: [baseUrl],
    mapCenter,
    inferenceZoom,
    task,
    presetId: presetId === 'custom' ? 'custom' : presetId,
  };
}

export function toProviderParams(config: TmsQuickstartConfig): ProviderParams {
  return config.providerParams;
}

export function formatTaskLabel(task: QuickstartTask): string {
  return task
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
