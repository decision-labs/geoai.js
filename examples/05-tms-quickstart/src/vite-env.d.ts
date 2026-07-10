/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TMS_BASE_URL?: string;
  readonly VITE_TMS_SCHEME?: 'WebMercator' | 'TMS';
  readonly VITE_TMS_ATTRIBUTION?: string;
  readonly VITE_TMS_EXTENSION?: string;
  readonly VITE_TMS_API_KEY?: string;
  readonly VITE_GEOAI_TASK?: string;
  readonly VITE_MAP_CENTER?: string;
  readonly VITE_INFERENCE_ZOOM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
