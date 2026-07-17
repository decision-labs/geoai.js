import type { OamParams, ProviderParams } from 'geoai';

export type QuickstartTask = 'building-detection' | 'car-detection' | 'object-detection';

export const SUPPORTED_TASKS: QuickstartTask[] = [
  'building-detection',
  'car-detection',
  'object-detection',
];

/** Known OAM coverage — Rome orthophoto (STAC item). */
export const ROME_ITEM_ID = '67826781a07cc20001818cdb';

export const OAM_MOSAIC_TILE_URL =
  'https://api.imagery.hotosm.org/raster/collections/openaerialmap/tiles/WebMercatorQuad/{z}/{x}/{y}?assets=visual';

export function buildOamItemMapTileUrl(itemId: string): string {
  return `https://api.imagery.hotosm.org/raster/collections/openaerialmap/items/${encodeURIComponent(itemId)}/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?assets=visual`;
}

export type OamMode = 'auto' | 'mosaic' | 'item';

export type OamQuickstartConfig = {
  providerParams: OamParams;
  mapTiles: string[];
  mapCenter: [number, number];
  inferenceZoom: number;
  task: QuickstartTask;
  mode: OamMode;
};

const DEFAULT_CENTER: [number, number] = [12.49, 41.891];
const DEFAULT_ZOOM = 16;

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

function parseMode(value: string | undefined): OamMode {
  if (value === 'mosaic' || value === 'item' || value === 'auto') {
    return value;
  }
  return 'item';
}

export function buildOamConfig(overrides?: {
  mode?: OamMode;
  itemId?: string;
  task?: QuickstartTask;
  mapCenter?: [number, number];
  inferenceZoom?: number;
}): OamQuickstartConfig {
  const mode = overrides?.mode || parseMode(import.meta.env.VITE_OAM_MODE);
  const itemId =
    overrides?.itemId?.trim() ||
    import.meta.env.VITE_OAM_ITEM_ID ||
    ROME_ITEM_ID;
  const task = overrides?.task || parseTask(import.meta.env.VITE_GEOAI_TASK);
  const mapCenter =
    overrides?.mapCenter ||
    parseMapCenter(import.meta.env.VITE_MAP_CENTER, DEFAULT_CENTER);
  const inferenceZoom =
    overrides?.inferenceZoom ??
    parseInferenceZoom(import.meta.env.VITE_INFERENCE_ZOOM, DEFAULT_ZOOM);

  let providerParams: OamParams;
  let mapTiles: string[];

  if (mode === 'mosaic') {
    providerParams = {
      provider: 'oam',
      mosaic: true,
      attribution: 'OpenAerialMap / HOT Imagery',
    };
    mapTiles = [OAM_MOSAIC_TILE_URL];
  } else if (mode === 'auto') {
    providerParams = {
      provider: 'oam',
      attribution: 'OpenAerialMap / HOT Imagery',
    };
    // Map display uses mosaic; inference STAC-picks the best item for the AOI.
    mapTiles = [OAM_MOSAIC_TILE_URL];
  } else {
    providerParams = {
      provider: 'oam',
      itemId,
      attribution: 'OpenAerialMap / HOT Imagery',
    };
    mapTiles = [buildOamItemMapTileUrl(itemId)];
  }

  return {
    providerParams,
    mapTiles,
    mapCenter,
    inferenceZoom,
    task,
    mode,
  };
}

export function toProviderParams(config: OamQuickstartConfig): ProviderParams {
  return config.providerParams;
}

export function formatTaskLabel(task: QuickstartTask): string {
  return task
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
