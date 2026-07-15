import type { StyleSpecification } from 'maplibre-gl';

import { TMS_TILE_URL, WMS_MAP_TILE_URL } from './providerConfig';

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

interface BaseMapStyleOptions {
  includeMapboxBase?: boolean;
  mapboxTileStyle?: 'satellite' | 'satellite-v9';
  maxZoom?: number;
  includeGlyphs?: boolean;
}

/**
 * Creates a reusable MapLibre style specification for base map layers
 * 
 * This function eliminates duplication across example pages by providing a centralized
 * way to create map styles with different configurations for various map providers.
 * 
 * @param config - Configuration object containing provider settings
 * @param options - Optional configuration for map style variations
 * @returns MapLibre style specification
 * 
 * @example
 * // Basic usage with default options (no mapbox-base layer, satellite-v9, maxZoom 23)
 * const mapStyle = createBaseMapStyle({
 *   mapProvider: "geobase",
 *   geobaseConfig: GEOBASE_CONFIG,
 *   mapboxConfig: MAPBOX_CONFIG,
 * });
 * 
 * @example
 * // With mapbox-base layer (streets-v12) for geobase provider
 * const mapStyle = createBaseMapStyle({
 *   mapProvider: "geobase",
 *   geobaseConfig: GEOBASE_CONFIG,
 *   mapboxConfig: MAPBOX_CONFIG,
 * }, {
 *   includeMapboxBase: true,
 *   mapboxTileStyle: 'satellite-v9',
 *   maxZoom: 23
 * });
 * 
 * @example
 * // With older mapbox satellite tiles and glyphs support
 * const mapStyle = createBaseMapStyle({
 *   mapProvider: "mapbox",
 *   geobaseConfig: GEOBASE_CONFIG,
 *   mapboxConfig: MAPBOX_CONFIG,
 * }, {
 *   includeMapboxBase: false,
 *   mapboxTileStyle: 'satellite',
 *   maxZoom: 22,
 *   includeGlyphs: true
 * });
 */
export function createBaseMapStyle(config: MapStyleConfig, options: BaseMapStyleOptions = {}): StyleSpecification {
  const { mapProvider, geobaseConfig, mapboxConfig } = config;
  const {
    includeMapboxBase = false,
    mapboxTileStyle = 'satellite-v9',
    maxZoom = 23,
    includeGlyphs = false
  } = options;

  // Determine Mapbox tile URL based on style preference
  const getMapboxTileUrl = () => {
    if (mapboxTileStyle === 'satellite') {
      return `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.jpg90?access_token=${mapboxConfig.apiKey}`;
    }
    return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${mapboxConfig.apiKey}`;
  };

  const getMapboxBaseTileUrl = () => {
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxConfig.apiKey}`;
  };

  const style: StyleSpecification = {
    version: 8 as const,
    sources: {
      "geobase-tiles": {
        type: "raster",
        tiles: [
          `${process.env.NEXT_PUBLIC_BASE_PATH}/api/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${geobaseConfig.cogImagery}&apikey=${geobaseConfig.apikey}`,
        ],
        tileSize: 256,
      },
      "mapbox-tiles": {
        type: "raster",
        tiles: [getMapboxTileUrl()],
        tileSize: mapboxTileStyle === 'satellite' ? 256 : 512,
      },
      "esri-tiles": {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "ESRI World Imagery",
      },
      "tms-tiles": {
        type: "raster",
        tiles: [TMS_TILE_URL],
        tileSize: 256,
        attribution: "© Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      },
      "wms-tiles": {
        type: "raster",
        tiles: [WMS_MAP_TILE_URL],
        tileSize: 256,
        attribution: "© Geobasis NRW / Bezirksregierung Köln",
      },
    },
    layers: [
      {
        id: "geobase-layer",
        type: "raster",
        source: "geobase-tiles",
        minzoom: 0,
        maxzoom: maxZoom,
        layout: {
          visibility: mapProvider === "geobase" ? "visible" : "none",
        },
      },
      {
        id: "mapbox-layer",
        type: "raster",
        source: "mapbox-tiles",
        minzoom: 0,
        maxzoom: maxZoom,
        layout: {
          visibility: mapProvider === "mapbox" ? "visible" : "none",
        },
      },
      {
        id: "esri-layer",
        type: "raster",
        source: "esri-tiles",
        minzoom: 0,
        maxzoom: maxZoom,
        layout: {
          visibility: mapProvider === "esri" ? "visible" : "none",
        },
      },
      {
        id: "tms-layer",
        type: "raster",
        source: "tms-tiles",
        minzoom: 0,
        maxzoom: maxZoom,
        layout: {
          visibility: mapProvider === "tms" ? "visible" : "none",
        },
      },
      {
        id: "wms-layer",
        type: "raster",
        source: "wms-tiles",
        minzoom: 0,
        maxzoom: maxZoom,
        layout: {
          visibility: mapProvider === "wms" ? "visible" : "none",
        },
      },
    ],
  };

  // Add Mapbox base layer if requested
  if (includeMapboxBase) {
    style.sources["mapbox-base"] = {
      type: "raster",
      tiles: [getMapboxBaseTileUrl()],
      tileSize: 512,
    };
    
    style.layers.unshift({
      id: "mapbox-base-layer",
      type: "raster",
      source: "mapbox-base",
      minzoom: 0,
      maxzoom: maxZoom,
      layout: {
        visibility: mapProvider === "geobase" ? "visible" : "none",
      },
    });
  }

  // Add glyphs if requested
  if (includeGlyphs) {
    style.glyphs = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
  }

  return style;
}

/**
 * Creates a MapLibre style specification for the image feature extraction task
 * 
 * This is a convenience function that uses createBaseMapStyle with specific
 * options for the image feature extraction example.
 * 
 * @param config - Configuration object containing provider settings
 * @returns MapLibre style specification
 */
export function createImageFeatureExtractionMapStyle(config: MapStyleConfig): StyleSpecification {
  return createBaseMapStyle(config, {
    includeMapboxBase: true,
    mapboxTileStyle: 'satellite-v9',
    maxZoom: 23
  });
}
