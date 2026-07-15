/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WMS_BASE_URL?: string;
  readonly VITE_WMS_LAYERS?: string;
  readonly VITE_WMS_VERSION?: '1.1.1' | '1.3.0';
  readonly VITE_WMS_CRS?: 'EPSG:3857' | 'EPSG:4326';
  readonly VITE_WMS_FORMAT?: string;
  readonly VITE_WMS_ATTRIBUTION?: string;
  readonly VITE_GEOAI_TASK?: string;
  readonly VITE_MAP_CENTER?: string;
  readonly VITE_INFERENCE_ZOOM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
