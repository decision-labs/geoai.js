import type { WmsParams } from "@/core/types";

/** Geobasis NRW digital orthophotos (DOP) — public WMS, no API key. */
export const NRW_DOP_WMS_URL = "https://www.wms.nrw.de/geobasis/wms_nw_dop";

export const NRW_DOP_LAYER = "nw_dop_rgb";

export const NRW_DOP_ATTRIBUTION =
  "© Geobasis NRW / Bezirksregierung Köln (Digitale Orthophotos)";

export const wmsNrwDopParams: WmsParams = {
  provider: "wms",
  baseUrl: NRW_DOP_WMS_URL,
  layers: NRW_DOP_LAYER,
  version: "1.3.0",
  crs: "EPSG:3857",
  attribution: NRW_DOP_ATTRIBUTION,
};

/** Small polygon in central Cologne for NRW orthophoto smoke tests. */
export const polygonCologne = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [6.9585, 50.9415],
        [6.957, 50.9415],
        [6.957, 50.9405],
        [6.9585, 50.9405],
        [6.9585, 50.9415],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

/** MapLibre raster source template — same GetMap params as GeoAI WMS provider. */
export const NRW_DOP_MAP_TILE_URL = `${NRW_DOP_WMS_URL}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${NRW_DOP_LAYER}&STYLES=&FORMAT=image%2Fpng&WIDTH=256&HEIGHT=256&CRS=EPSG%3A3857&BBOX={bbox-epsg-3857}`;

export const COLOGNE_MAP_CENTER: [number, number] = [6.958, 50.941];

export const NRW_INFERENCE_ZOOM = 17;
