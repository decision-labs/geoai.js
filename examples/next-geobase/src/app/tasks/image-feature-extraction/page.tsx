"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";

import { useGeoAIWorker } from "../../../hooks/useGeoAIWorker";
import { useDebounce } from "../../../hooks/useDebounce";

import { 
  BackgroundEffects,
  ExportButton,
  ImageFeatureExtractionVisualization,
  ImageFeatureExtractionSimilarityLayer,
  MapProviderSelector,
  InfoTooltip,
  ImageFeatureExtractionContextualMenu,
  ModelStatusMessage,
  TaskInfo,
  ZoomControl,
  ActionButtons,
  LoadingMessage,
  CornerDecorations,
  MapProviderSelectorWrapper
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
  const [isPrecomputedMessageDismissed, setIsPrecomputedMessageDismissed] = useState<boolean>(false);
  
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
    setIsPrecomputedMessageDismissed(false);
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

  // Handler to dismiss precomputed embeddings message
  const handleDismissPrecomputedMessage = () => {
    setIsPrecomputedMessageDismissed(true);
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
        <LoadingMessage
          isLoading={isLoadingPrecomputedEmbeddings}
          isVisible={showPrecomputedEmbeddingsMessage && isInitialized && showPrecomputedEmbeddings && !isPrecomputedMessageDismissed}
          onDismiss={handleDismissPrecomputedMessage}
        />



        {/* Task Info - Bottom Right */}
        <div className="absolute bottom-6 right-6 z-10">
          <TaskInfo
            taskName="Image Feature Extraction"
            modelId={lastResult?.metadata?.modelId}
            isInitialized={isInitialized}
          />
        </div>

        {/* Map Provider Selector - Top Left */}
        <MapProviderSelectorWrapper
          value={mapProvider}
          onChange={debouncedMapProviderChange}
        />

        {/* Zoom Control - Top Right */}
        <div className="absolute top-6 right-6 z-10">
          <ZoomControl
            zoomLevel={zoomLevel}
            onZoomChange={handleZoomChange}
            minZoom={15}
            maxZoom={22}
          />
        </div>
        
        {/* Action Buttons - Top middle of map */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 flex items-center space-x-2">
          <ActionButtons
            isInitialized={isInitialized}
            isDrawingMode={isDrawingMode}
            polygon={polygon}
            isButtonDisabled={isButtonDisabled}
            isButtonLoading={isButtonLoading}
            isExtractingFeatures={isExtractingFeatures}
            isLoadingPrecomputedEmbeddings={isLoadingPrecomputedEmbeddings}
            showPrecomputedEmbeddings={showPrecomputedEmbeddings}
            isResetting={isResetting}
            lastResult={lastResult}
            mapProvider={mapProvider}
            allPatches={allPatches}
            onStartDrawing={handleStartDrawing}
            onReset={handleReset}
            onResetToDemo={handleResetToDemo}
          />
        </div>
        
        {/* Corner decorations */}
        <CornerDecorations />
      </div>
    </main>
  );
}
