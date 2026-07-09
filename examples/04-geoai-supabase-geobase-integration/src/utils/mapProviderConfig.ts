export type MapProviderId = 'esri' | 'mapbox' | 'geobase' | 'google';

/** Native raster tile availability per provider (MapLibre map max zoom). */
export const PROVIDER_MAX_ZOOM: Record<MapProviderId, number> = {
  esri: 20,
  mapbox: 22,
  geobase: 22,
  google: 20,
};

export const getProviderMaxZoom = (provider: string): number =>
  PROVIDER_MAX_ZOOM[provider as MapProviderId] ?? 22;

/** Clamp a task demo zoom to what the active map provider supports. */
export const clampTaskZoom = (demoZoom: number, providerMaxZoom: number): number =>
  Math.min(Math.max(1, demoZoom), providerMaxZoom);
