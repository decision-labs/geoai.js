import { GeobaseParams, GoogleMapsParams } from "geoai";

export const ESRI_CONFIG = {
  provider: "esri" as const,
  serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
  serviceName: "World_Imagery",
  tileSize: 256,
  attribution: "ESRI World Imagery",
};

export const GEOBASE_CONFIG : GeobaseParams = {
  provider: "geobase" as const,
  projectRef: process.env.NEXT_PUBLIC_GEOBASE_PROJECT_REF ?? "",
  apikey: process.env.NEXT_PUBLIC_GEOBASE_API_KEY ?? "",
  cogImagery: "",
};

export const MAPBOX_CONFIG = {
  provider: "mapbox" as const,
  apiKey: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "test",
  style: "mapbox://styles/mapbox/satellite-v9",
};

/** Inference via Google Map Tiles through a same-origin proxy (server holds the key). */
export const GOOGLE_CONFIG: GoogleMapsParams = {
  provider: "google",
  // Key is injected by /api/google-tiles; not sent from the browser.
  apiKey: "proxy",
  mapType: "satellite",
  tileApiUrl: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/google-tiles`,
  includeApiKey: false,
  attribution: "© Google Maps / Map Tiles API",
};


export const GITHUB_REPO_URI = "https://github.com/decision-labs/geoai.js";
export const GITHUB_REPO_NAME = "decision-labs/geoai.js";
export const NPM_PACKAGE_NAME = "geoai";
export const NPM_PACKAGE_URI = "https://www.npmjs.com/package/geoai";
