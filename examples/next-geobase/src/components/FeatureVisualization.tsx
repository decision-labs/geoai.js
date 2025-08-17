import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { detectGPU, type GPUInfo } from '../utils/gpuUtils';
import { createColorExpression, createOpacityExpression } from '../utils/maplibreUtils';

interface FeatureVisualizationProps {
  map: maplibregl.Map | null;
  features: number[][] | null;
  similarityMatrix: number[][] | null;
  patchSize: number | null;
  geoRawImage: any;
  onPatchesReady?: (patches: GeoJSON.Feature<GeoJSON.Polygon>[]) => void;
}

export const FeatureVisualization: React.FC<FeatureVisualizationProps> = ({
  map,
  features,
  similarityMatrix,
  patchSize,
  geoRawImage,
  onPatchesReady,
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
        // Use utility function to create optimal color expression based on GPU capabilities
        const colorExpression = createColorExpression(
          gpuInfo.current,
          hoveredPatchIndex
        );
        
        map.setPaintProperty(layerRef.current, 'fill-color', colorExpression);
        
        const opacityExpression = createOpacityExpression(
          hoveredPatchIndex
        );
        map.setPaintProperty(layerRef.current, 'fill-opacity', opacityExpression);
      } catch (error) {
        console.warn('Error updating layer styling:', error);
      }
    } else {
      try {
        // Reset to default styling - no source data updates needed
        map.setPaintProperty(layerRef.current, 'fill-color', '#8c2981'); // Magma purple
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
        console.warn('Error during layer cleanup:', error);
      }
    }
  };

  useEffect(() => {
    if (!map || !features || !similarityMatrix || !patchSize || !geoRawImage) {
      return;
    }

    const startTime = Date.now();
    console.log("FeatureVisualization - Update hook started");
    
    // Cleanup existing layers
    cleanupLayers();

    // Calculate patches per row and column
    const patchesPerRow = Math.floor(geoRawImage.width / patchSize);
    const patchesPerCol = Math.floor(geoRawImage.height / patchSize);
    
    // Get geographic bounds
    const geoBounds = geoRawImage.bounds;
    
    if (!geoBounds || !geoBounds.west || !geoBounds.east || !geoBounds.north || !geoBounds.south) {
      return;
    }

    // Calculate geographic coordinates for each patch
    const patchWidth = (geoBounds.east - geoBounds.west) / patchesPerRow;
    const patchHeight = (geoBounds.north - geoBounds.south) / patchesPerCol;

    // Create a single layer with all patches
    const allPatches: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
    
    for (let i = 0; i < patchesPerCol; i++) {
      for (let j = 0; j < patchesPerRow; j++) {
        const patchIndex = i * patchesPerRow + j;
        if (patchIndex < features.length) {
          // Calculate patch bounds in geographic coordinates
          const patchWest = geoBounds.west + j * patchWidth;
          const patchEast = geoBounds.west + (j + 1) * patchWidth;
          const patchNorth = geoBounds.north - i * patchHeight;
          const patchSouth = geoBounds.north - (i + 1) * patchHeight;

          // Create patch polygon with pre-computed similarity data
          const patchPolygon: GeoJSON.Feature<GeoJSON.Polygon> = {
            type: "Feature",
            properties: {
              patchIndex,
              i,
              j,
              // TODO: These properties might be needed for export functionality
              // Consider adding them back with a flag to avoid visualization performance hit
              // featureVector: features[patchIndex], // Raw feature vector for export
              // similarities: similarityMatrix[patchIndex], // Full similarity array for export
              // Store similarity array for efficient styling
              similarities: similarityMatrix[patchIndex],
            },
            geometry: {
              type: "Polygon",
              coordinates: [[
                [patchWest, patchNorth],
                [patchEast, patchNorth],
                [patchEast, patchSouth],
                [patchWest, patchSouth],
                [patchWest, patchNorth]
              ]]
            }
          };

          allPatches.push(patchPolygon);
        }
      }
    }

    // Store all patches for export (no longer needed since we pass directly to onPatchesReady)
    
    // Notify parent component that patches are ready
    if (onPatchesReady) {
      onPatchesReady(allPatches);
    }

    // Create single source and layer for all patches
    const sourceId = `feature-patches-source`;
    const layerId = `feature-patches-layer`;
    
    sourceRef.current = sourceId;
    layerRef.current = layerId;

    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: allPatches,
      },
    });

    // Add single layer with dynamic styling
    map.addLayer({
      id: layerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#8c2981', // Magma purple
        'fill-opacity': 0.4, // Slightly higher opacity
      },
    });

    map.on('mousemove', layerId, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const patchIndex = feature.properties?.patchIndex;
    
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
    console.log(`FeatureVisualization - Update hook completed in ${endTime - startTime}ms`);

    return () => {
      cleanupLayers();
    };
  }, [features, similarityMatrix, patchSize, geoRawImage]);

  return null;
};
