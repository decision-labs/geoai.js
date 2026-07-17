/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OAM_MODE?: 'auto' | 'mosaic' | 'item';
  readonly VITE_OAM_ITEM_ID?: string;
  readonly VITE_GEOAI_TASK?: string;
  readonly VITE_MAP_CENTER?: string;
  readonly VITE_INFERENCE_ZOOM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
