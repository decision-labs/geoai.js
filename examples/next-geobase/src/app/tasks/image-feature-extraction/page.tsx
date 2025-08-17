"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";

import { useGeoAIWorker } from "../../../hooks/useGeoAIWorker";
import { useDebounce } from "../../../hooks/useDebounce";
import { Pencil, Target, Trash2, Loader2, X, Info } from "lucide-react";
import { 
  BackgroundEffects,
  FeatureExtractionDemoLayerHint,
  ExportButton,
  FeatureVisualization,
  MVTCachedFeatureSimilarityLayer,
  MapProviderSelector,
  InfoTooltip
} from "../../../components";
import { MapUtils } from "../../../utils/mapUtils";
import { createImageFeatureExtractionMapStyle } from "../../../utils/mapStyleUtils";
import { ESRI_CONFIG, GEOBASE_CONFIG, MAPBOX_CONFIG } from "../../../config";
import { MapProvider } from "../../../types";

GEOBASE_CONFIG.cogImagery = "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/67ba1d2bec9237a9ebd358a3/0/67ba1d2bec9237a9ebd358a4.tif";

const mapInitConfig = {
  center: [114.84857638295142, -3.449805712621256] as [number, number],
  zoom: 18,
};

// Add validation for required environment variables
if (!GEOBASE_CONFIG.projectRef || !GEOBASE_CONFIG.apikey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_GEOBASE_PROJECT_REF and/or NEXT_PUBLIC_GEOBASE_API_KEY"
  );
}

export default function ImageFeatureExtraction() {
  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MaplibreDraw | null>(null);
  
  // GeoAI hook
  const {
    isInitialized,
    isProcessing,
    error,
    lastResult,
    initializeModel,
    runInference,
    clearError,
    clearResult,
  } = useGeoAIWorker();

  const [polygon, setPolygon] = useState<GeoJSON.Feature | null>(null);
  const [features, setFeatures] = useState<any>();
  const [zoomLevel, setZoomLevel] = useState<number>(22);
  const [mapProvider, setMapProvider] = useState<MapProvider>("geobase");
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.5);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isExtractingFeatures, setIsExtractingFeatures] = useState<boolean>(false);
  const [allPatches, setAllPatches] = useState<GeoJSON.Feature<GeoJSON.Polygon>[]>([]);
  const [isLoadingDemoLayer, setIsLoadingDemoLayer] = useState<boolean>(false);
  const [showDemoLayerHint, setShowDemoLayerHint] = useState<boolean>(false);
  const [hasShownDemoHint, setHasShownDemoHint] = useState<boolean>(false);
  
  // Contextual menu state
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuThreshold, setContextMenuThreshold] = useState<number>(0.5);

  // Debounced handlers for performance optimization
  const debouncedZoomChange = useDebounce((newZoom: number) => {
    if (map.current) {
      MapUtils.setZoom(map.current, newZoom);
    }
  }, 150);

  const debouncedSimilarityThresholdChange = useDebounce((threshold: number) => {
    setSimilarityThreshold(threshold);
  }, 300);

  const debouncedMapProviderChange = useDebounce((provider: MapProvider) => {
    setMapProvider(provider);
  }, 200);

  const debouncedExtractFeatures = useDebounce(() => {
    if (!polygon) return;
    
    setIsExtractingFeatures(true);
    runInference({
      inputs: {
        polygon: polygon
      },
      mapSourceParams: {
        zoomLevel,
      },
      postProcessingParams: {
        similarityThreshold: contextMenuThreshold,
      }
    });
  }, 500);

  // Callback to receive patches from FeatureVisualization
  const handlePatchesReady = useCallback((patches: GeoJSON.Feature<GeoJSON.Polygon>[]) => {
    setAllPatches(patches);
    
    // Make the original polygon unfilled after embeddings are drawn
    if (map.current && draw.current && patches.length > 0) {
      // Remove the polygon fill by adding a custom layer that overrides the fill
      const sourceId = 'unfilled-polygon-override';
      const layerId = 'unfilled-polygon-layer';
      
      // Remove existing override layers if they exist
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
      
      // Get the current polygon from draw control
      const allFeatures = draw.current.getAll();
      if (allFeatures && allFeatures.features.length > 0) {
        // Add a transparent fill layer that covers the original polygon
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: allFeatures
        });
        
        // Check if the target layer exists before inserting before it
        const targetLayer = 'gl-draw-polygon-fill-inactive';
        const beforeLayer = map.current.getLayer(targetLayer) ? targetLayer : undefined;
        
        map.current.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#ffffff',
            'fill-opacity': 0 // Completely transparent
          }
        }, beforeLayer); // Insert before the target layer if it exists, otherwise add at the end
      }
    }
  }, []);

  // Direct feature extraction function that doesn't rely on polygon state
  const extractFeaturesDirectly = (polygonFeature: GeoJSON.Feature) => {
    setIsExtractingFeatures(true);
    runInference({
      inputs: {
        polygon: polygonFeature
      },
      mapSourceParams: {
        zoomLevel,
      },
      postProcessingParams: {
        similarityThreshold: contextMenuThreshold,
      }
    });
  };

  // Function to show contextual menu at polygon center
  const showContextMenuAtPolygon = useCallback((polygonFeature: GeoJSON.Feature) => {
    if (!map.current || !polygonFeature.geometry || polygonFeature.geometry.type !== 'Polygon') {
      return;
    }

    // Calculate the center of the polygon
    const coordinates = polygonFeature.geometry.coordinates[0];
    let centerLng = 0;
    let centerLat = 0;
    
    for (const coord of coordinates) {
      centerLng += coord[0];
      centerLat += coord[1];
    }
    
    centerLng /= coordinates.length;
    centerLat /= coordinates.length;

    // Convert to screen coordinates
    const point = map.current.project([centerLng, centerLat]);
    
    // Get map container bounds
    const container = map.current.getContainer();
    const rect = container.getBoundingClientRect();
    
    // Position menu near the polygon center, but ensure it's within viewport
    const x = Math.max(20, Math.min(rect.width - 300, point.x));
    const y = Math.max(20, Math.min(rect.height - 200, point.y));
    
    setContextMenuPosition({ x, y });
    setContextMenuThreshold(similarityThreshold);
    setShowContextMenu(true);
  }, [similarityThreshold]);

  // Function to hide contextual menu
  const hideContextMenu = () => {
    setShowContextMenu(false);
    setContextMenuPosition(null);
  };

  const closeDemoLayerHint = () => {
    setShowDemoLayerHint(false);
  };

  // Function to handle contextual menu feature extraction
  const handleContextMenuExtractFeatures = () => {
    if (!polygon) return;
    
    // Update the main similarity threshold
    setSimilarityThreshold(contextMenuThreshold);
    
    // Run inference with the contextual menu threshold
    extractFeaturesDirectly(polygon);
    
    // Hide the menu after extraction starts
    hideContextMenu();
  };

  // Debounced zoom handler for map events
  const debouncedZoomHandler = useDebounce(() => {
    if (map.current) {
      const currentZoom = Math.round(map.current.getZoom());
      setZoomLevel(currentZoom);
    }
  }, 100);

  // Debounced polygon update to prevent excessive re-renders during drawing
  const debouncedUpdatePolygon = useDebounce(() => {
    const features = draw.current?.getAll();
    if (features && features.features.length > 0) {
      setPolygon(features.features[0]);
    } else {
      setPolygon(null);
    }
  }, 200);

  const handleReset = async () => {
    setIsResetting(true);
    
    try {
      // Clear all drawn features
      if (draw.current) {
        draw.current.deleteAll();
      }

      // Clear map layers using utility function
      if (map.current) {
        MapUtils.clearAllLayers(map.current);
      }

      // Reset states
      setPolygon(null);
      setFeatures(undefined);
      setIsExtractingFeatures(false);
      clearError();
      
      // Clear result to remove FeatureVisualization without resetting model
      clearResult();
      
      // Hide contextual menu
      hideContextMenu();
      
      // Show demo layer hint again after reset (but only if not shown before)
      if (!hasShownDemoHint) {
        setShowDemoLayerHint(true);
        setHasShownDemoHint(true);
      }
    } finally {
      setIsResetting(false);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    // Use debounced map zoom update for better performance
    debouncedZoomChange(newZoom);
  };

  const handleExtractFeatures = () => {
    if (!polygon) return;
    
    // Use debounced feature extraction to prevent rapid successive calls
    debouncedExtractFeatures();
  };

  const handleStartDrawing = () => {
    if (draw.current) {
      draw.current.changeMode("draw_polygon");
      setIsDrawingMode(true);
      
      // Hide contextual menu when starting to draw
      hideContextMenu();
      // Hide demo layer hint when starting to draw
      setShowDemoLayerHint(false);
    } else {
      console.error('❌ Draw control not initialized');
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapStyle = createImageFeatureExtractionMapStyle({
      mapProvider,
      geobaseConfig: GEOBASE_CONFIG,
      mapboxConfig: MAPBOX_CONFIG,
    });

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: mapInitConfig.center,
      zoom: mapInitConfig.zoom,
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

    // Ensure draw controls are visible with proper z-index
    setTimeout(() => {
      const drawControls = map.current?.getContainer().querySelector('.maplibregl-draw');
      if (drawControls) {
        (drawControls as HTMLElement).style.zIndex = '1000';
        (drawControls as HTMLElement).style.position = 'relative';
      }
    }, 100);

    // Listen for polygon creation
    map.current.on("draw.create", (e) => {
      updatePolygon();
      
      // Show contextual menu instead of auto-running inference
      setTimeout(() => {
        const features = draw.current?.getAll();
        if (features && features.features.length > 0) {
          showContextMenuAtPolygon(features.features[0]);
        }
      }, 100); // Small delay to ensure polygon is fully set
    });
    map.current.on("draw.update", (e) => {
      updatePolygon();
    });
    map.current.on("draw.delete", (e) => {
      setPolygon(null);
      hideContextMenu();
      
      // Remove the unfilled polygon override layer
      if (map.current) {
        const layerId = 'unfilled-polygon-layer';
        const sourceId = 'unfilled-polygon-override';
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        if (map.current.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
      }
    });
    
    // Listen for drawing mode changes
    map.current.on("draw.modechange", (e: any) => {
      setIsDrawingMode(e.mode === 'draw_polygon');
    });

    // Listen for zoom changes to sync with slider
    map.current.on("zoom", debouncedZoomHandler);

    // Initialize zoom level with current map zoom
    setZoomLevel(Math.round(map.current.getZoom()));

    function updatePolygon() {
      debouncedUpdatePolygon();
    }

    return () => {
      if (map.current) {
        // Remove the unfilled polygon override layer before removing the map
        const layerId = 'unfilled-polygon-layer';
        const sourceId = 'unfilled-polygon-override';
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        if (map.current.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
        map.current.remove();
      }
      // Clean up any pending debounced calls
      debouncedUpdatePolygon.cancel?.();
    };
  }, [mapProvider, showContextMenuAtPolygon]);

  // Initialize the model when the map provider changes
  useEffect(() => {
    let providerParams;
    if (mapProvider === "geobase") {
      providerParams = GEOBASE_CONFIG;
    } else if (mapProvider === "esri") {
      providerParams = ESRI_CONFIG;
    } else {
      providerParams = MAPBOX_CONFIG;
    }

    initializeModel({
      tasks: [{
        task: "image-feature-extraction",
      }],
      providerParams,
    });
  }, [mapProvider, initializeModel]);

  // Handle results from the worker
  useEffect(() => {
    if (lastResult?.features && map.current) {
      // Display feature extraction results
      setFeatures(lastResult.features);
      
      // Set extracting features to false when results are available
      if (lastResult.similarityMatrix) {
        setIsExtractingFeatures(false);
      }
      
      // Display the inference bounds
      if (lastResult.geoRawImage?.bounds) {
        MapUtils.displayInferenceBounds(map.current, lastResult.geoRawImage.bounds);
      }
    }
  }, [lastResult]);

  return (
    <main className="w-full h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 relative">
      <BackgroundEffects />
      
      {/* Global styles for draw controls */}
      <style jsx global>{`
        .maplibregl-draw {
          z-index: 1000 !important;
          position: relative !important;
        }
        .maplibregl-draw .maplibregl-draw-polygon {
          background: #fff !important;
          border: 2px solid #007cbf !important;
          border-radius: 4px !important;
          color: #007cbf !important;
          font-weight: bold !important;
          padding: 8px 12px !important;
          margin: 4px !important;
          cursor: pointer !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
        }
        .maplibregl-draw .maplibregl-draw-polygon:hover {
          background: #007cbf !important;
          color: #fff !important;
        }
        .maplibregl-draw .maplibregl-draw-trash {
          background: #fff !important;
          border: 2px solid #dc3545 !important;
          border-radius: 4px !important;
          color: #dc3545 !important;
          font-weight: bold !important;
          padding: 8px 12px !important;
          margin: 4px !important;
          cursor: pointer !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
        }
        .maplibregl-draw .maplibregl-draw-trash:hover {
          background: #dc3545 !important;
          color: #fff !important;
        }
        
        /* Style for unfilled polygons */
        .maplibregl-draw .maplibregl-draw-polygon-fill-inactive[data-unfilled="true"],
        .maplibregl-draw .maplibregl-draw-polygon-fill-active[data-unfilled="true"] {
          fill-opacity: 0 !important;
        }
      `}</style>

      {/* Map Container */}
      <div className="w-full h-full relative">
        {/* Map overlay with subtle border */}
        <div className="absolute inset-2 rounded-lg overflow-hidden border border-gray-200/50 shadow-2xl">
          <div 
            ref={mapContainer} 
            className="w-full h-full relative" 
            style={{ zIndex: 1 }}
          />
        </div>
        
        {/* Contextual Menu */}
        {showContextMenu && contextMenuPosition && (
          <div 
            className="absolute z-50 bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg shadow-2xl p-4 min-w-[280px]"
            style={{
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Extract Features</h3>
              <button
                onClick={hideContextMenu}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Similarity Threshold Slider */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Similarity Threshold: {contextMenuThreshold}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={contextMenuThreshold}
                onChange={(e) => setContextMenuThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher values filter out less similar features
              </p>
            </div>
            
            {/* Extract Features Button */}
            <button
              onClick={handleContextMenuExtractFeatures}
              disabled={!isInitialized || isProcessing}
              className="w-full px-4 py-2 bg-teal-600 text-white rounded-md shadow-lg font-medium text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 border border-teal-500"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  <span>Extract Features</span>
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Feature Visualization */}
        {(() => {
          if (lastResult?.features && lastResult?.similarityMatrix) {
            return (
              <FeatureVisualization
                map={map.current}
                features={lastResult.features}
                similarityMatrix={lastResult.similarityMatrix}
                patchSize={lastResult.patchSize}
                geoRawImage={lastResult.geoRawImage}
                onPatchesReady={handlePatchesReady}
              />
            );
          } else {
            return null;
          }
        })()}

        {/* Cached Feature Similarity Layer - Show when no features are extracted */}
        {!lastResult?.features && (
          <MVTCachedFeatureSimilarityLayer 
            map={map.current} 
            onLoadingChange={(isLoading) => {
              setIsLoadingDemoLayer(isLoading);
              if (!isLoading && !hasShownDemoHint) {
                // Show hint after loading completes, but only once
                setShowDemoLayerHint(true);
                setHasShownDemoHint(true);
              }
            }}
          />
        )}
        

        
        {/* Status Message - Bottom Left */}
        <div className="absolute bottom-6 left-6 z-10 bg-white/90 text-gray-800 px-3 py-2 rounded-md shadow-md backdrop-blur-sm border border-gray-200">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-yellow-500'} ${isProcessing ? 'animate-pulse' : ''}`}></div>
            <span className="text-sm font-medium">
              {isProcessing ? 'Processing...' : isInitialized ? 'Model Ready' : 'Initializing...'}
            </span>
          </div>
          {isDrawingMode && (
            <p className="text-xs text-gray-600 mt-1">Draw a polygon to extract features</p>
          )}
          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </div>

        {/* Demo Layer Loading Message - Center */}
        {isLoadingDemoLayer && isInitialized && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg shadow-2xl px-6 py-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-800">Loading demo layer...</span>
            </div>
          </div>
        )}

        {/* Feature Extraction Demo Layer Hint */}
        {showDemoLayerHint && !lastResult?.features && (
          <FeatureExtractionDemoLayerHint
            isVisible={showDemoLayerHint}
            onClose={closeDemoLayerHint}
            duration={3000}
          />
        )}

        {/* Task Info - Bottom Right */}
        <div className="absolute bottom-6 right-6 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-md shadow-md p-3">
          <div className="text-right">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              Image Feature Extraction
            </h3>
            {lastResult?.metadata?.modelId && (
              <p className="text-xs text-gray-600 font-mono">
                {lastResult.metadata.modelId}
              </p>
            )}
            {!lastResult?.metadata?.modelId && isInitialized && (
              <p className="text-xs text-gray-500 italic">
                DINOv3 Model
              </p>
            )}
          </div>
        </div>

        {/* Map Provider Selector - Top Left */}
        <div className="absolute top-6 left-6 z-20 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-md shadow-md p-2">
          <MapProviderSelector
            value={mapProvider}
            onChange={debouncedMapProviderChange}
            className=""
          />
        </div>

        {/* Zoom Control - Top Right */}
        <div className="absolute top-6 right-6 z-10 bg-white/90 text-gray-800 px-3 py-2 rounded-md shadow-md backdrop-blur-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex flex-col items-center space-y-1">
              <button
                onClick={() => handleZoomChange(zoomLevel + 1)}
                disabled={zoomLevel >= 22}
                className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded text-gray-600 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={() => handleZoomChange(zoomLevel - 1)}
                disabled={zoomLevel <= 15}
                className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded text-gray-600 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 font-medium">ZOOM</span>
                  <InfoTooltip 
                    title="Zoom Parameter"
                    position="bottom"
                  >
                    <p>Zoom level is passed as a parameter to the model for inference. See <code className="font-mono text-blue-300">BaseModel.polygonToImage()</code> method.</p>
                  </InfoTooltip>
                </div>
              <span className="text-sm font-semibold text-gray-800">{zoomLevel}</span>
            </div>
          </div>
        </div>
        
        {/* Action Buttons - Top middle of map */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 flex items-center space-x-2">
          {/* Start Drawing / Reset Button */}
          {!isInitialized ? (
            // Loading state when model is initializing
            <div className="px-4 py-2 rounded-md shadow-xl backdrop-blur-sm font-medium text-sm flex items-center space-x-2 border bg-blue-600 text-white border-blue-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading Model...</span>
            </div>
          ) : (
            <button
              onClick={isDrawingMode ? handleStartDrawing : (polygon ? handleReset : handleStartDrawing)}
              disabled={isResetting || isExtractingFeatures}
              className={`px-4 py-2 rounded-md shadow-xl backdrop-blur-sm font-medium text-sm transition-all duration-200 flex items-center space-x-2 border ${
                isResetting ? 'bg-gray-400 text-white border-gray-300' : // Resetting state
                isExtractingFeatures ? 'bg-gray-400 text-white border-gray-300' : // Extracting features
                isDrawingMode ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500' : // Drawing active
                polygon ? 'bg-rose-600 text-white hover:bg-rose-700 border-rose-500' : // Polygon drawn (Reset)
                'bg-blue-600 text-white hover:bg-blue-700 border-blue-500' // Initial (Start Drawing)
              }`}
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : isExtractingFeatures ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Features...</span>
                </>
              ) : isDrawingMode ? (
                <>
                  <Target className="w-4 h-4" />
                  <span>Drawing Active</span>
                </>
              ) : polygon ? (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Reset</span>
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" />
                  <span>Draw & Extract</span>
                </>
              )}
            </button>
          )}

          {/* Export Button */}
          {lastResult?.features && (
            <ExportButton
              detections={lastResult.features}
              geoRawImage={lastResult?.geoRawImage}
              task="image-feature-extraction"
              provider={mapProvider}
              embeddings={lastResult?.features && lastResult?.similarityMatrix && lastResult?.patchSize && allPatches.length > 0 ? {
                features: lastResult.features,
                similarityMatrix: lastResult.similarityMatrix,
                patchSize: lastResult.patchSize,
                allPatches: allPatches
              } : undefined}
            />
          )}
        </div>
        
        {/* Corner decorations */}
        <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-green-400/40 rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-lg"></div>
      </div>
    </main>
  );
}
