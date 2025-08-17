import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { detectGPU, type GPUInfo } from '../utils/gpuUtils';
import { getOptimalColorScheme } from '../utils/maplibreUtils';

interface MVTCachedFeatureSimilarityLayerProps {
  map: maplibregl.Map | null;
  onLoadingChange?: (isLoading: boolean) => void;
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

export const MVTCachedFeatureSimilarityLayer: React.FC<MVTCachedFeatureSimilarityLayerProps> = ({
  map,
  onLoadingChange,
}) => {
  const sourceRef = useRef<string | null>(null);
  const layerRef = useRef<string | null>(null);
  const hoveredPatchRef = useRef<number | null>(null);
  
  // GPU capabilities for performance optimization
  const gpuInfo = useRef<GPUInfo>({
    hasWebGPU: false,
    isHighPerformance: false,
  });
  
  // Initialize GPU detection on mount
  useEffect(() => {
    detectGPU().then((info) => {
      gpuInfo.current = info;
    });
  }, []);

  // Helper function to update layer styling based on hovered patch
  const updateLayerStyling = (hoveredPatchIndex: number | null) => {
    if (!map || !map.getStyle || !layerRef.current) return;
    
    hoveredPatchRef.current = hoveredPatchIndex;
    
    if (hoveredPatchIndex !== null) {
      try {
        // Get optimal color scheme based on GPU capabilities
        const colorScheme = getOptimalColorScheme(gpuInfo.current);
        
        // Create heatmap styling based on similarities with the hovered patch
        const colorExpression = [
          "case",
          ["has", "similarities"],
          [
            "interpolate",
            ["linear"],
            ["at", hoveredPatchIndex, ["feature-state", "similarities"]],
            0, colorScheme.low,      // Black
            0.2, colorScheme.lowMedium || colorScheme.medium, // Dark purple
            0.4, colorScheme.medium, // Purple
            0.6, colorScheme.mediumHigh || colorScheme.high, // Pink-red
            0.8, colorScheme.high,   // Orange
            1, colorScheme.highest || colorScheme.high // Bright yellow-white
          ],
          "#8c2981"  // Default color (magma purple)
        ];
        
        map.setPaintProperty(layerRef.current, 'fill-color', colorExpression);
        
        const opacityExpression = [
          "case",
          ["has", "similarities"],
          [
            "interpolate",
            ["linear"],
            ["at", hoveredPatchIndex, ["feature-state", "similarities"]],
            0, 0.3,   // Lower opacity for low similarity
            1, 0.8    // Higher opacity for high similarity
          ],
          0.4  // Default opacity
        ];
        
        map.setPaintProperty(layerRef.current, 'fill-opacity', opacityExpression);
      } catch (error) {
        console.warn('Error updating layer styling:', error);
      }
    } else {
      try {
        // Reset to default styling - same as FeatureVisualization
        map.setPaintProperty(layerRef.current, 'fill-color', "#8c2981"); // Magma purple
        map.setPaintProperty(layerRef.current, 'fill-opacity', 0.4); // Slightly higher opacity
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
        console.warn('Error during cached similarity layer cleanup:', error);
      }
    }
  };

  useEffect(() => {
    if (!map) {
      return;
    }

    const startTime = Date.now();
    console.log("MVTCachedFeatureSimilarityLayer - Loading cached similarity layer");
    
    // Notify parent that loading has started
    onLoadingChange?.(true);
    
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
        `https://${process.env.NEXT_PUBLIC_GEOBASE_EMBEDDINGS_PROJECT_REF}.geobase.app/tileserver/v1/cached/public.array_embeddings_compressed/{z}/{x}/{y}.pbf?apikey=${process.env.NEXT_PUBLIC_GEOBASE_EMBEDDINGS_CACHE_ANON_KEY}`,
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
        "fill-color": "rgba(123, 168, 234, 0.1)",
        "fill-outline-color": "rgba(255, 255, 255, 0.3)"
      },
      filter: ["==", "$type", "Polygon"],
    });

    // Listen for tile loading completion
    let hasNotifiedCompletion = false;
    map.on('idle', () => {
      // Check if our layer is loaded and has data
      if (map.isSourceLoaded(sourceId) && !hasNotifiedCompletion) {
        const features = map.querySourceFeatures(sourceId, {
          sourceLayer: 'public.array_embeddings_compressed'
        });
        
        if (features.length > 0) {
          const endTime = Date.now();
          console.log(`MVTCachedFeatureSimilarityLayer - Tiles fully loaded in ${endTime - startTime}ms`);
          
          // Notify parent that loading has completed (only once)
          hasNotifiedCompletion = true;
          onLoadingChange?.(false);
        }
      }
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
    console.log(`MVTCachedFeatureSimilarityLayer - Layer added to map in ${endTime - startTime}ms`);

    return () => {
      cleanupLayers();
    };
  }, [map]);

  return null;
};
