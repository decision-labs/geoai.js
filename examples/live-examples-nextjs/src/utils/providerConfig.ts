import type { OamParams, ProviderParams, TmsParams, WmsParams } from 'geoai';
import type maplibregl from 'maplibre-gl';
import { ESRI_CONFIG, GEOBASE_CONFIG, GOOGLE_CONFIG, MAPBOX_CONFIG } from '../config';
import type { MapProvider } from '../types';

/** ESRI World Imagery as TMS — same tiles, `provider: "tms"` pipeline. */
export const TMS_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const TMS_CONFIG: TmsParams = {
  provider: 'tms',
  baseUrl: TMS_TILE_URL,
  scheme: 'WebMercator',
  tileSize: 256,
  attribution: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
};

export const NRW_DOP_WMS_URL = 'https://www.wms.nrw.de/geobasis/wms_nw_dop';
export const NRW_DOP_LAYER = 'nw_dop_rgb';

export const NRW_VIEW_BOUNDS = {
  west: 5.593338,
  east: 9.741582,
  south: 50.057798,
  north: 52.799797,
} as const;

export const NRW_MAP_MAX_BOUNDS: [[number, number], [number, number]] = [
  [NRW_VIEW_BOUNDS.west, NRW_VIEW_BOUNDS.south],
  [NRW_VIEW_BOUNDS.east, NRW_VIEW_BOUNDS.north],
];

/** Cologne — default view for NRW orthophotos. */
export const WMS_DEFAULT_CENTER: [number, number] = [6.958, 50.941];

export const WMS_CONFIG: WmsParams = {
  provider: 'wms',
  baseUrl: NRW_DOP_WMS_URL,
  layers: NRW_DOP_LAYER,
  version: '1.3.0',
  crs: 'EPSG:3857',
  format: 'image/png',
  tileSize: 256,
  attribution: '© Geobasis NRW / Bezirksregierung Köln',
};

/** MapLibre WMS tile URL — keep `{bbox-epsg-3857}` literal per MapLibre docs. */
export function buildWmsMapTileUrl(params: WmsParams): string {
  const version = params.version ?? '1.3.0';
  const crs = params.crs ?? 'EPSG:3857';
  const format = params.format ?? 'image/png';
  const styles = params.styles ?? '';
  const tileSize = params.tileSize ?? 256;
  const crsParam = version === '1.3.0' ? 'CRS' : 'SRS';
  const bboxParam = version === '1.3.0' ? 'BBOX' : 'bbox';

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

export const WMS_MAP_TILE_URL = buildWmsMapTileUrl(WMS_CONFIG);

/** Rome — known OpenAerialMap coverage for live demos. */
export const OAM_DEFAULT_CENTER: [number, number] = [12.49, 41.891];

export const OAM_MOSAIC_TILE_URL =
  'https://api.imagery.hotosm.org/raster/collections/openaerialmap/tiles/WebMercatorQuad/{z}/{x}/{y}?assets=visual';

/** Mosaic for map + inference so display and pipeline stay aligned. */
export const OAM_CONFIG: OamParams = {
  provider: 'oam',
  mosaic: true,
  tileSize: 256,
  attribution: 'OpenAerialMap / HOT Imagery',
};

type ProviderOptions = {
  cogImagery?: string;
};

export function getProviderParams(
  mapProvider: MapProvider,
  options?: ProviderOptions,
): ProviderParams {
  switch (mapProvider) {
    case 'geobase':
      return {
        ...GEOBASE_CONFIG,
        cogImagery: options?.cogImagery ?? GEOBASE_CONFIG.cogImagery,
      };
    case 'esri':
      return ESRI_CONFIG;
    case 'mapbox':
      return MAPBOX_CONFIG;
    case 'tms':
      return TMS_CONFIG;
    case 'wms':
      return WMS_CONFIG;
    case 'oam':
      return OAM_CONFIG;
    case 'google':
      return GOOGLE_CONFIG;
    default:
      return ESRI_CONFIG;
  }
}

export const VEHICLE_DETECTION_LABELS = new Set(['LightVehicle', 'Truck', 'Bus', 'Bike']);

/** Car segmentation masks are empty on WMS tiles — use object-detection bboxes instead. */
export function getPipelineTask(pageTask: string, mapProvider: MapProvider): string {
  if (pageTask === 'car-detection' && mapProvider === 'wms') {
    return 'object-detection';
  }
  return pageTask;
}

export function filterCarDetectionsForWms(
  mapProvider: MapProvider,
  detections: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  if (mapProvider !== 'wms') {
    return detections;
  }
  return {
    type: 'FeatureCollection',
    features: detections.features.filter((feature) => {
      const label = feature.properties?.label;
      return typeof label === 'string' && VEHICLE_DETECTION_LABELS.has(label);
    }),
  };
}

type CameraState = {
  center: { lng: number; lat: number };
  zoom: number;
  bearing: number;
  pitch: number;
};

/**
 * After a style swap: restore the previous camera, or move to a known AOI for
 * sparse providers (WMS → NRW, OAM → Rome).
 */
export function restoreCameraAfterProviderChange(
  map: maplibregl.Map,
  mapProvider: MapProvider,
  previous: CameraState,
): void {
  if (mapProvider === 'wms' || mapProvider === 'oam') {
    applyProviderMapSettings(map, mapProvider);
    return;
  }

  map.setCenter([previous.center.lng, previous.center.lat]);
  map.setZoom(previous.zoom);
  map.setBearing(previous.bearing);
  map.setPitch(previous.pitch);
  applyProviderMapSettings(map, mapProvider);
}

export function applyProviderMapSettings(map: maplibregl.Map, mapProvider: MapProvider): void {
  if (mapProvider === 'wms') {
    map.setMaxBounds(NRW_MAP_MAX_BOUNDS);
    // Always jump to NRW when selecting WMS — orthophotos only cover this extent.
    map.flyTo({ center: WMS_DEFAULT_CENTER, zoom: 17, duration: 1200 });
  } else if (mapProvider === 'oam') {
    map.setMaxBounds(null);
    // OAM coverage is sparse — jump to Rome where demo imagery exists.
    map.flyTo({ center: OAM_DEFAULT_CENTER, zoom: 16, duration: 1200 });
  } else {
    map.setMaxBounds(null);
  }
}
