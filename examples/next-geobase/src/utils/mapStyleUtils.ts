import type { StyleSpecification } from 'maplibre-gl';

interface MapConfig {
  projectRef?: string;
  apikey?: string;
  cogImagery?: string;
  apiKey?: string;
}

interface MapStyleConfig {
  mapProvider: string;
  geobaseConfig: MapConfig;
  mapboxConfig: MapConfig;
}

/**
 * Creates a MapLibre style specification for the image feature extraction task
 * @param config - Configuration object containing provider settings
 * @returns MapLibre style specification
 */
export function createImageFeatureExtractionMapStyle(config: MapStyleConfig): StyleSpecification {
  const { mapProvider, geobaseConfig, mapboxConfig } = config;

  return {
    version: 8 as const,
    sources: {
      "mapbox-base": {
        type: "raster",
        tiles: [
          `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxConfig.apiKey}`,
        ],
        tileSize: 512,
      },
      "geobase-tiles": {
        type: "raster",
        tiles: [
          `https://${geobaseConfig.projectRef}.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${geobaseConfig.cogImagery}&apikey=${geobaseConfig.apikey}`,
        ],
        tileSize: 256,
      },
      "mapbox-tiles": {
        type: "raster",
        tiles: [
          `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${mapboxConfig.apiKey}`,
        ],
        tileSize: 512,
      },
      "esri-tiles": {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "ESRI World Imagery",
      },
    },
    layers: [
      {
        id: "mapbox-base-layer",
        type: "raster",
        source: "mapbox-base",
        minzoom: 0,
        maxzoom: 23,
        layout: {
          visibility: mapProvider === "geobase" ? "visible" : "none",
        },
      },
      {
        id: "geobase-layer",
        type: "raster",
        source: "geobase-tiles",
        minzoom: 0,
        maxzoom: 23,
        layout: {
          visibility: mapProvider === "geobase" ? "visible" : "none",
        },
      },
      {
        id: "mapbox-layer",
        type: "raster",
        source: "mapbox-tiles",
        minzoom: 0,
        maxzoom: 23,
        layout: {
          visibility: mapProvider === "mapbox" ? "visible" : "none",
        },
      },
      {
        id: "esri-layer",
        type: "raster",
        source: "esri-tiles",
        minzoom: 0,
        maxzoom: 23,
        layout: {
          visibility: mapProvider === "esri" ? "visible" : "none",
        },
      },
    ],
  };
}
