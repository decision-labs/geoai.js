"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";

import { useGeoAIWorker } from "../../../hooks/useGeoAIWorker";
import { useDebounce } from "../../../hooks/useDebounce";
import { Pencil, Target, Trash2, Loader2 } from "lucide-react";
import { 
  BackgroundEffects,
  ExportButton,
  ImageFeatureExtractionVisualization,
  ImageFeatureExtractionSimilarityLayer,
  MapProviderSelector,
  InfoTooltip,
  ImageFeatureExtractionContextualMenu,
  ModelStatusMessage,
  TaskInfo
} from "../../../components";
import { MapUtils } from "../../../utils/mapUtils";
import { createImageFeatureExtractionMapStyle } from "../../../utils/mapStyleUtils";
import { ESRI_CONFIG, GEOBASE_CONFIG, MAPBOX_CONFIG } from "../../../config";
import { MapProvider } from "../../../types";
import styles from "./page.module.css";

GEOBASE_CONFIG.cogImagery = "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/67ba1d2bec9237a9ebd358a3/0/67ba1d2bec9237a9ebd358a4.tif";

// Initial demo location for precomputed embeddings
const INITIAL_DEMO_LOCATION = {
  center: [114.84901, -3.449806] as [number, number],
  zoom: 18.2,
};

const mapInitConfig = INITIAL_DEMO_LOCATION;

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

  // Map and drawing state
  const [polygon, setPolygon] = useState<GeoJSON.Feature | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(22);
  const [mapProvider, setMapProvider] = useState<MapProvider>("geobase");
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  
  // Processing state
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isExtractingFeatures, setIsExtractingFeatures] = useState<boolean>(false);
  const [allPatches, setAllPatches] = useState<GeoJSON.Feature<GeoJSON.Polygon>[]>([]);
  
  // Precomputed embeddings state
  const [isLoadingPrecomputedEmbeddings, setIsLoadingPrecomputedEmbeddings] = useState<boolean>(false);
  const [precomputedEmbeddingsRef, setPrecomputedEmbeddingsRef] = useState<{ cleanup: () => void } | null>(null);
  const [showPrecomputedEmbeddingsMessage, setShowPrecomputedEmbeddingsMessage] = useState<boolean>(false);
  const [showPrecomputedEmbeddings, setShowPrecomputedEmbeddings] = useState<boolean>(true);
  
  // Contextual menu state
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuThreshold, setContextMenuThreshold] = useState<number>(0.5);

  // Computed values for button states
  const isButtonDisabled = isResetting || isExtractingFeatures || (isLoadingPrecomputedEmbeddings && showPrecomputedEmbeddings);
  const isButtonLoading = isResetting || (isLoadingPrecomputedEmbeddings && showPrecomputedEmbeddings);

  // Debounced handlers for performance optimization
  const debouncedZoomChange = useDebounce((newZoom: number) => {
    if (map.current) {
      MapUtils.setZoom(map.current, newZoom);
    }
  }, 150);



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

  // Callback to receive patches from ImageFeatureExtractionVisualization
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
    setContextMenuThreshold(0.5); // Default threshold
    setShowContextMenu(true);
  }, []);

  // Function to hide contextual menu
  const hideContextMenu = () => {
    setShowContextMenu(false);
    setContextMenuPosition(null);
  };



  const handleCleanupReady = useCallback((cleanup: () => void) => {
          setPrecomputedEmbeddingsRef({ cleanup });
  }, []);

  // Function to handle contextual menu feature extraction
  const handleContextMenuExtractFeatures = () => {
    if (!polygon) return;
    
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

  // Common reset logic
  const clearCurrentState = () => {
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
    setIsExtractingFeatures(false);
    clearError();
    
    // Clear result to remove ImageFeatureExtractionVisualization without resetting model
    clearResult();
    
    // Hide contextual menu
    hideContextMenu();
    
    // Reset drawing mode
    setIsDrawingMode(false);
    
    // Hide precomputed embeddings when resetting
    setShowPrecomputedEmbeddings(false);
  };

  const handleReset = async () => {
    setIsResetting(true);
    
    try {
      clearCurrentState();
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetToDemo = async () => {
    setIsResetting(true);
    
    try {
      clearCurrentState();
      
      // Reset to initial demo location
      if (map.current) {
        map.current.flyTo({
          center: INITIAL_DEMO_LOCATION.center,
          zoom: INITIAL_DEMO_LOCATION.zoom,
          duration: 1000
        });
        setZoomLevel(INITIAL_DEMO_LOCATION.zoom);
      }
      
      // Show precomputed embeddings when resetting to demo
      setShowPrecomputedEmbeddings(true);
    } finally {
      setIsResetting(false);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    // Use debounced map zoom update for better performance
    debouncedZoomChange(newZoom);
  };



  const handleStartDrawing = () => {
    if (draw.current) {
      // Clear precomputed embeddings when starting to draw
      if (precomputedEmbeddingsRef) {
        precomputedEmbeddingsRef.cleanup();
        setPrecomputedEmbeddingsRef(null);
      }
      
      draw.current.changeMode("draw_polygon");
      setIsDrawingMode(true);
      
      // Hide contextual menu when starting to draw
      hideContextMenu();
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

  // Disable/enable draw controls based on precomputed embeddings loading state
  useEffect(() => {
    if (draw.current) {
      const drawControls = map.current?.getContainer().querySelector('.maplibregl-draw');
      if (drawControls) {
        const polygonButton = drawControls.querySelector('.maplibregl-draw-polygon') as HTMLElement;
        const trashButton = drawControls.querySelector('.maplibregl-draw-trash') as HTMLElement;
        
        if (polygonButton) {
          polygonButton.style.opacity = isLoadingPrecomputedEmbeddings ? '0.5' : '1';
          polygonButton.style.pointerEvents = isLoadingPrecomputedEmbeddings ? 'none' : 'auto';
          polygonButton.style.cursor = isLoadingPrecomputedEmbeddings ? 'not-allowed' : 'pointer';
        }
        
        if (trashButton) {
          trashButton.style.opacity = isLoadingPrecomputedEmbeddings ? '0.5' : '1';
          trashButton.style.pointerEvents = isLoadingPrecomputedEmbeddings ? 'none' : 'auto';
          trashButton.style.cursor = isLoadingPrecomputedEmbeddings ? 'not-allowed' : 'pointer';
        }
      }
    }
  }, [isLoadingPrecomputedEmbeddings]);

  // Handle results from the worker
  useEffect(() => {
    if (lastResult?.features && map.current) {
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
        <ImageFeatureExtractionContextualMenu
          position={showContextMenu ? contextMenuPosition : null}
          threshold={contextMenuThreshold}
          isInitialized={isInitialized}
          isProcessing={isProcessing}
          onThresholdChange={setContextMenuThreshold}
          onExtractFeatures={handleContextMenuExtractFeatures}
          onClose={hideContextMenu}
        />
        
        {/* Feature Visualization */}
        {lastResult?.features && lastResult?.similarityMatrix && (
          <ImageFeatureExtractionVisualization
            map={map.current}
            features={lastResult.features}
            similarityMatrix={lastResult.similarityMatrix}
            patchSize={lastResult.patchSize}
            geoRawImage={lastResult.geoRawImage}
            onPatchesReady={handlePatchesReady}
          />
        )}

        {/* Precomputed Embeddings Layer - Show when no features are extracted and embeddings should be shown */}
        {!lastResult?.features && showPrecomputedEmbeddings && (
          <>
            <ImageFeatureExtractionSimilarityLayer 
              map={map.current} 
              onLoadingChange={(isLoading) => {
                setIsLoadingPrecomputedEmbeddings(isLoading);
                setShowPrecomputedEmbeddingsMessage(true);
                
                if (!isLoading) {
                  // Show completion message briefly, then hide
                  setTimeout(() => {
                    setShowPrecomputedEmbeddingsMessage(false);
                  }, 2000); // Show for 2 seconds
                }
              }}
              onCleanupReady={handleCleanupReady}
            />
            

            

          </>
        )}
        

        
        {/* Status Message - Bottom Left */}
        <div className="absolute bottom-6 left-6 z-10">
          <ModelStatusMessage
            isInitialized={isInitialized}
            isProcessing={isProcessing}
            isDrawingMode={isDrawingMode}
            error={error}
          />
        </div>

        {/* Precomputed Embeddings Loading/Completion Message - Center */}
        {showPrecomputedEmbeddingsMessage && isInitialized && showPrecomputedEmbeddings && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg shadow-2xl px-6 py-4">
            <div className="flex items-center space-x-3">
              {isLoadingPrecomputedEmbeddings ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-sm font-medium text-gray-800">Loading precomputed embeddings...</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800">Precomputed embeddings loaded!</span>
                    <div className="flex items-center space-x-1 mt-1">
                      <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
                      </svg>
                      <span className="text-xs text-gray-600">Hover over areas to see similar embeddings</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}



        {/* Task Info - Bottom Right */}
        <div className="absolute bottom-6 right-6 z-10">
          <TaskInfo
            taskName="Image Feature Extraction"
            modelId={lastResult?.metadata?.modelId}
            isInitialized={isInitialized}
          />
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
            <>
              <button
                onClick={isDrawingMode ? handleStartDrawing : (polygon ? handleReset : handleStartDrawing)}
                disabled={isButtonDisabled}
                className={`px-4 py-2 rounded-md shadow-xl backdrop-blur-sm font-medium text-sm transition-all duration-200 flex items-center space-x-2 border ${
                  isButtonLoading ? 'bg-gray-400 text-white border-gray-300' : // Resetting state or loading precomputed embeddings
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
                ) : (isLoadingPrecomputedEmbeddings && showPrecomputedEmbeddings) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading Precomputed Embeddings...</span>
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
                    <span>Reset & Draw Another</span>
                  </>
                ) : (
                  <>
                    <Pencil className="w-4 h-4" />
                    <span>Draw & Extract</span>
                  </>
                )}
              </button>

              {/* Reset to Demo Button - Show when features have been extracted */}
              {lastResult?.features && (
                <button
                  onClick={handleResetToDemo}
                  disabled={isButtonDisabled}
                  className="px-4 py-2 rounded-md shadow-xl backdrop-blur-sm font-medium text-sm transition-all duration-200 flex items-center space-x-2 border bg-purple-600 text-white hover:bg-purple-700 border-purple-500"
                  title="Reset current work and return to precomputed embeddings demo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
                  </svg>
                  <span>Reset & Load Demo</span>
                </button>
              )}
            </>
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
