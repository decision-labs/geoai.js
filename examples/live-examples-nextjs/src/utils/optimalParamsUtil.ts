// Map of provider + task to optimum zoom level
const mapZoomLookup: Record<string, number> = {
  "geobase:object-detection": 20,
  "geobase:building-detection": 18,
  "geobase:changestar-building-segmentation": 16,
  "geobase:car-detection": 21,
  "geobase:ship-detection": 20,
  "geobase:solar-panel-detection": 21,
  "geobase:oil-storage-tank-detection": 15,
  "geobase:land-cover-classification": 19,
  "geobase:wetland-segmentation": 17,
  "geobase:building-footprint-segmentation": 15,
  "geobase:zero-shot-object-detection": 20,
  "geobase:mask-generation": 19,
  "geobase:oriented-object-detection": 21,
  "wms:object-detection": 18,
  "wms:building-detection": 17,
  "wms:car-detection": 20,
};

const PROVIDER_ZOOM_FALLBACK: Record<string, string> = {
  tms: 'esri',
  wms: 'esri',
};

export const getOptimumZoom = (task: string, provider: string): number | null => {
  const key = `${provider}:${task}`;
  if (mapZoomLookup[key] != null) {
    return mapZoomLookup[key];
  }
  const fallbackProvider = PROVIDER_ZOOM_FALLBACK[provider];
  if (fallbackProvider) {
    return mapZoomLookup[`${fallbackProvider}:${task}`] ?? null;
  }
  return null;
};
