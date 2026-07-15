import MaplibreGeocoder, {
  type CarmenGeojsonFeature,
  type MaplibreGeocoderApi,
  type MaplibreGeocoderApiConfig,
} from '@maplibre/maplibre-gl-geocoder';
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
import maplibregl from 'maplibre-gl';
import { NRW_GEOCODER_BBOX, NRW_VIEW_BOUNDS } from './wmsConfig';

const NOMINATIM_VIEWBOX = [
  NRW_VIEW_BOUNDS.west,
  NRW_VIEW_BOUNDS.north,
  NRW_VIEW_BOUNDS.east,
  NRW_VIEW_BOUNDS.south,
].join(',');

const NOMINATIM_USER_AGENT = 'geoai-wms-quickstart (https://github.com/decision-labs/geoai.js)';

type NominatimFeature = GeoJSON.Feature & {
  bbox?: [number, number, number, number];
  properties: {
    display_name?: string;
    name?: string;
  };
};

const nrwGeocoderApi: MaplibreGeocoderApi = {
  forwardGeocode: async (config: MaplibreGeocoderApiConfig) => {
    const features: CarmenGeojsonFeature[] = [];
    const query = typeof config.query === 'string' ? config.query.trim() : '';

    if (!query) {
      return { type: 'FeatureCollection', features };
    }

    try {
      const request =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
        `&format=geojson&addressdetails=1&countrycodes=de` +
        `&viewbox=${NOMINATIM_VIEWBOX}&bounded=1&limit=5`;

      const response = await fetch(request, {
        headers: {
          'Accept-Language': 'de',
          'User-Agent': NOMINATIM_USER_AGENT,
        },
      });

      if (!response.ok) {
        return { type: 'FeatureCollection', features };
      }

      const geojson = (await response.json()) as GeoJSON.FeatureCollection;
      for (const feature of (geojson.features ?? []) as NominatimFeature[]) {
        const bbox = feature.bbox;
        const center: [number, number] =
          feature.geometry?.type === 'Point'
            ? (feature.geometry.coordinates as [number, number])
            : bbox
              ? [bbox[0] + (bbox[2] - bbox[0]) / 2, bbox[1] + (bbox[3] - bbox[1]) / 2]
              : [0, 0];

        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: center },
          properties: feature.properties,
          place_name: feature.properties.display_name ?? query,
          text: feature.properties.name ?? feature.properties.display_name ?? query,
          place_type: ['place'],
          center,
          bbox,
        });
      }
    } catch (error) {
      console.error('NRW geocoder failed:', error);
    }

    return { type: 'FeatureCollection', features };
  },
};

export function createNrwGeocoder(): MaplibreGeocoder {
  return new MaplibreGeocoder(nrwGeocoderApi, {
    maplibregl,
    bbox: NRW_GEOCODER_BBOX,
    placeholder: 'Search NRW (Köln, Düsseldorf…)',
    countries: 'de',
    language: 'de',
    zoom: 17,
    marker: true,
  });
}
