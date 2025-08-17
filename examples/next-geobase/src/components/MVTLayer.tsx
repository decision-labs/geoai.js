import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface MVTLayerProps {
  map: maplibregl.Map | null;
}

// robust PG numeric array parser: "{1,2,3,}" -> [1,2,3]
const parsePgNumArray = (s?: string | null): number[] | null => {
  if (typeof s !== "string") return null;
  const m = s.match(/^\{([\s\S]*)\}$/);
  if (!m) return null;
  const inner = m[1].trim();
  if (!inner) return [];
  const out: number[] = [];
  for (const part of inner.split(",")) {
    const t = part.trim();
    if (t === "") continue; // trailing comma
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    out.push(n);
  }
  return out;
};

export const MVTLayer: React.FC<MVTLayerProps> = ({
  map,
}) => {
  const sourceRef = useRef<string | null>(null);
  const layerRef = useRef<string | null>(null);
  const hoveredPatchRef = useRef<number | null>(null);

  // Helper function to update layer styling based on hovered patch
  const updateLayerStyling = (hoveredPatchIndex: number | null) => {
    if (!map || !map.getStyle || !layerRef.current) return;
    
    hoveredPatchRef.current = hoveredPatchIndex;
    
    if (hoveredPatchIndex !== null) {
      try {
        // Create heatmap styling based on similarities with the hovered patch
        const colorExpression = [
          "case",
          ["has", "similarities"],
          [
            "interpolate",
            ["linear"],
            ["at", hoveredPatchIndex, ["feature-state", "similarities"]],
            0, ["rgba", 255, 255, 255, 0.1],  // Low similarity - transparent
            0.5, ["rgba", 255, 165, 0, 0.3],   // Medium similarity - orange
            1, ["rgba", 255, 0, 0, 0.8]        // High similarity - red
          ],
          "rgba(123, 168, 234, 0.5)"  // Default color
        ];
        
        map.setPaintProperty(layerRef.current, 'fill-color', colorExpression);
        
        const opacityExpression = [
          "case",
          ["has", "similarities"],
          [
            "interpolate",
            ["linear"],
            ["at", hoveredPatchIndex, ["feature-state", "similarities"]],
            0, 0.1,   // Low similarity - low opacity
            0.5, 0.4, // Medium similarity - medium opacity
            1, 0.8    // High similarity - high opacity
          ],
          0.5  // Default opacity
        ];
        
        map.setPaintProperty(layerRef.current, 'fill-opacity', opacityExpression);
      } catch (error) {
        console.warn('Error updating layer styling:', error);
      }
    } else {
      try {
        // Reset to default styling
        map.setPaintProperty(layerRef.current, 'fill-color', "rgba(123, 168, 234, 0.5)");
        map.setPaintProperty(layerRef.current, 'fill-opacity', 0.5);
      } catch (error) {
        console.warn('Error resetting layer styling:', error);
      }
    }
  };

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
      // Promote ogc_fid as the unique identifier for the layer
      promoteId: { 'public.array_embeddings_compressed': 'ogc_fid' }
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

    // Set feature-state for similarities data
    map.on('sourcedata', (e) => {
      if (e.sourceId === sourceId && e.isSourceLoaded) {
        const features = map.querySourceFeatures(sourceId, {
          sourceLayer: 'public.array_embeddings_compressed'
        });
        
        features.forEach((feature) => {
          if (feature.properties && feature.properties.similarities) {
            const similarities = parsePgNumArray(feature.properties.similarities);
            if (similarities && feature.id) {
              map.setFeatureState({
                source: sourceId,
                sourceLayer: 'public.array_embeddings_compressed',
                id: feature.id,
              }, {
                similarities: similarities
              });
            }
          }
        });
      }
    });

    // Add hover events for heatmap styling
    map.on('mousemove', layerId, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const patchIndex = feature.properties?.patchindex;
    
        if (patchIndex !== undefined && patchIndex !== hoveredPatchRef.current) {
          map.getCanvas().style.cursor = 'crosshair';
          updateLayerStyling(patchIndex);
        }
      } else {
        // Cursor not on any patch
        if (hoveredPatchRef.current !== null) {
          map.getCanvas().style.cursor = '';
          updateLayerStyling(null);
        }
      }
    });

    const endTime = Date.now();
    console.log(`MVTLayer - MVT layer loaded in ${endTime - startTime}ms`);

    return () => {
      cleanupLayers();
    };
  }, [map]);

  return null;
};
