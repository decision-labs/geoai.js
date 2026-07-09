/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GEOBASE_PROJECT_REF: string
  readonly VITE_GEOBASE_API_KEY: string
  readonly VITE_GEOBASE_IMAGERY_URL: string
  readonly VITE_GEOBASE_EMBEDDINGS_PROJECT_REF: string
  readonly VITE_GEOBASE_EMBEDDINGS_CACHE_ANON_KEY: string
  readonly VITE_GEOBASE_TITILER: string
  readonly VITE_MAPBOX_TOKEN: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
