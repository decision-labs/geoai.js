import React, { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import MaplibreDraw from 'maplibre-gl-draw';
import type { StyleSpecification } from 'maplibre-gl';
import { MapProvider } from "../types"

interface MapConfig {
  provider: string;
  projectRef?: string;
  apikey?: string;
  cogImagery?: string;
  center: [number, number];
  zoom: number;
  apiKey?: string;
  style?: string;
}

interface GeoAIMapProps {
  mapProvider: MapProvider;
  geobaseConfig: MapConfig;
  mapboxConfig: MapConfig;
  onPolygonChange: (polygon: GeoJSON.Feature | null) => void;
  onZoomChange: (zoom: number) => void;
  onMapReady?: (map: maplibregl.Map, draw: MaplibreDraw) => void;
  className?: string;
}

export const GeoAIMap: React.FC<GeoAIMapProps> = ({
  mapProvider,
  geobaseConfig,
  mapboxConfig,
  onPolygonChange,
  onZoomChange,
  onMapReady,
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MaplibreDraw | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapStyle: StyleSpecification = {
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
      ],
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: geobaseConfig.center,
      zoom: geobaseConfig.zoom,
    });

    // Add draw control
    draw.current = new MaplibreDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
    });
    map.current.addControl(draw.current as any, "top-left");

    // Listen for polygon creation
    map.current.on("draw.create", updatePolygon);
    map.current.on("draw.update", updatePolygon);
    map.current.on("draw.delete", () => onPolygonChange(null));

    // Listen for zoom changes to sync with slider
    map.current.on("zoom", () => {
      if (map.current) {
        const currentZoom = Math.round(map.current.getZoom());
        onZoomChange(currentZoom);
      }
    });

    // Initialize zoom level with current map zoom
    onZoomChange(Math.round(map.current.getZoom()));

    function updatePolygon() {
      const features = draw.current?.getAll();
      if (features && features.features.length > 0) {
        onPolygonChange(features.features[0]);
      } else {
        onPolygonChange(null);
      }
    }

    // Notify parent that map is ready
    if (onMapReady && map.current && draw.current) {
      onMapReady(map.current, draw.current);
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [mapProvider, geobaseConfig, mapboxConfig, onPolygonChange, onZoomChange, onMapReady]);

  return <div ref={mapContainer} className={`w-full h-full ${className}`} />;
};
