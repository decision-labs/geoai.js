import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface MVTLayerProps {
  map: maplibregl.Map | null;
}

export const MVTLayer: React.FC<MVTLayerProps> = ({
  map,
}) => {
  const sourceRef = useRef<string | null>(null);
  const layerRef = useRef<string | null>(null);

  // Helper function to cleanup layers
  const cleanupLayers = () => {
    if (!map || !map.getStyle) return;

    if (sourceRef.current && layerRef.current) {
      try {
        if (map.getLayer(layerRef.current)) {
          map.removeLayer(layerRef.current);
        }
        if (map.getSource(sourceRef.current)) {
          map.removeSource(sourceRef.current);
        }
      } catch (error) {
        console.warn('Error during MVT layer cleanup:', error);
      }
    }
  };

  useEffect(() => {
    if (!map) {
      return;
    }

    const startTime = Date.now();
    console.log("MVTLayer - Loading MVT layer");
    
    // Cleanup existing layers
    cleanupLayers();

    // Create source and layer IDs
    const sourceId = 'geobase-mvt-tiles';
    const layerId = 'geobase-mvt-layer';
    
    sourceRef.current = sourceId;
    layerRef.current = layerId;

    // Add MVT source
    map.addSource(sourceId, {
      type: 'vector',
      tiles: [
        `https://nvptbsqezvuphqqgsjgr.geobase.app/tileserver/v1/public.array_embeddings_compressed/{z}/{x}/{y}.pbf?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE5MDc2MTYxMTMsImlhdCI6MTc0OTgzMTcxMywiaXNzIjoic3VwYWJhc2UiLCJyb2xlIjoiYW5vbiJ9.9RusmwQyyMmuNyfclx-dHeiu4VbJCKlA1SZWbdsnZKM`,
      ],
    });

    // Add MVT layer
    map.addLayer({
      id: layerId,
      type: 'fill',
      source: sourceId,
      'source-layer': 'public.array_embeddings_compressed',
      paint: {
        "fill-color": "rgba(123, 168, 234, 0.5)",
        "fill-outline-color": "rgba(255, 255, 255, 1)"
      },
      filter: ["==", "$type", "Polygon"],
    });

    const endTime = Date.now();
    console.log(`MVTLayer - MVT layer loaded in ${endTime - startTime}ms`);

    return () => {
      cleanupLayers();
    };
  }, [map]);

  return null;
};
