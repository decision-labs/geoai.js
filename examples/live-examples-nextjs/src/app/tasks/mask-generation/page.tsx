"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";
import type { StyleSpecification } from "maplibre-gl";
import { useGeoAIWorker } from "../../../hooks/useGeoAIWorker";
import { ESRI_CONFIG, GEOBASE_CONFIG, MAPBOX_CONFIG  } from "../../../config";
import { MapProvider } from "../../../types"
import { BackgroundEffects, ExportButton, GlassmorphismCard, GradientButton, MapProviderSelector, StatusMessage, ZoomSlider, TaskDownloadProgress } from "@/components";
import { ClearPoint, PlayIcon, PlusIcon, ResetIcon } from "@/components/DetectionControls";
import { MapUtils } from "../../../utils/mapUtils";
import { createBaseMapStyle } from "../../../utils/mapStyleUtils";
import { getOptimumZoom } from "@/utils/optimalParamsUtil";


GEOBASE_CONFIG.cogImagery = "https://huggingface.co/datasets/geobase/geoai-cogs/resolve/main/mask-generation.tif"

const mapInitConfig = {
  center: [-38.511321931983844, -13.008383365638252] as [number, number],
  zoom: getOptimumZoom("mask-generation","geobase") || 19,
}


// Add validation for required environment variables
if (!GEOBASE_CONFIG.projectRef || !GEOBASE_CONFIG.apikey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_GEOBASE_PROJECT_REF and/or NEXT_PUBLIC_GEOBASE_API_KEY"
  );
}

export default function MaskGeneration() {
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
  } = useGeoAIWorker();

  const [polygon, setPolygon] = useState<GeoJSON.Feature | null>(null);
  const [input, setInput] = useState<{
    type: "points" | "boxes";
    coordinates: number[];
  } | null>(null);
  const [detections, setDetections] = useState<GeoJSON.FeatureCollection[]>();
  const [zoomLevel, setZoomLevel] = useState<number>(22);
  const [maxMasks, setMaxMasks] = useState<number>(1);
  const [drawing, setDrawing] = useState<"points" | "polygon" | "bounds-point">("polygon");
  const drawingRef = useRef(drawing);
    useEffect(() => {
      drawingRef.current = drawing;
    }, [drawing]);
  const [mapProvider, setMapProvider] = useState<MapProvider>("geobase");
  const [label, setLabel] = useState<string>("");
  const [boundsPolygon, setBoundsPolygon] = useState<GeoJSON.Feature | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{
    coordinates: number[];
  } | null>(null);

  // Convert bounds to GeoJSON polygon
  const boundsToPolygon = (bounds: {east: number, west: number, north: number, south: number}): GeoJSON.Feature => {
    const { east, west, north, south } = bounds;
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south]
        ]]
      },
      properties: {
        type: "bounds"
      }
    };
  };

  const handleReset = () => {
    // Clear all drawn features
    if (draw.current) {
      draw.current.deleteAll();
    }

    // Clear map layers using utility function
    if (map.current) {
      MapUtils.clearAllLayers(map.current);
      // Also clear land cover specific layers
      for (let i = 0; i < 10; i++) {
        const layerId = `detections-layer-${i}`;
        const sourceId = `detections-source-${i}`;
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        if (map.current.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
      }
    }

    const rawImageSourceId = "geoai-rawimage";
    const rawImageLayerId = "geoai-rawimage-layer";

    if (map.current?.getLayer(rawImageLayerId)) {
      map.current.removeLayer(rawImageLayerId);
    }
    if (map.current?.getSource(rawImageSourceId)) {
      map.current.removeSource(rawImageSourceId);
    }

    // Reset states
    setPolygon(null);
    setDetections(undefined);
    clearError();
    setInput(null);
    setSelectedPoint(null);
  };

  const handleClearInput = () => {
    if (draw.current) {
      // Get all features and remove only point features
      const features = draw.current.getAll();
      const pointFeatures = features.features.filter(f => f.geometry.type === "Point");
      
      // Remove each point feature
      pointFeatures.forEach((feature) => {
        if (feature.id) {
          draw.current?.delete(String(feature.id));
        }
      });
    }
    
    // Clear input states
    setInput(null);
    setSelectedPoint(null);
  };

  const setMaskLabel = (value: string) => {
    console.log({detections});
    setLabel(value);
    if(detections && detections[0]?.features?.[0]?.properties){
      detections[0].features[0].properties.class = value
    }
  }

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapStyle = createBaseMapStyle({
      mapProvider,
      geobaseConfig: GEOBASE_CONFIG,
      mapboxConfig: MAPBOX_CONFIG,
    }, {
      includeMapboxBase: false,
      mapboxTileStyle: 'satellite',
      maxZoom: 22
    });

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: mapInitConfig.center,
      zoom: mapInitConfig.zoom,
    });

    map.current.on("zoom", () => {
      if (map.current) {
        const currentZoom = Math.round(map.current.getZoom());
        setZoomLevel(currentZoom);
      }
    });
    // Initialize zoom level with current map zoom
    setZoomLevel(Math.round(map.current.getZoom()));

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
    map.current.on("draw.delete", () => setPolygon(null));

    function updatePolygon() {
      console.log('updatePolygon called, drawing mode:', drawingRef.current);
      const features = draw.current?.getAll();
      console.log('Features from draw:', features);
      if (features && features.features.length > 0) {
        console.log('Number of features:', features.features.length);
        console.log('First feature:', features.features[0]);
        
        if(drawingRef.current === "polygon"){
          console.log('Setting polygon from feature:', features.features[0]);
          setPolygon(features.features[0]);
          // Clear any existing input when drawing a new polygon
          setInput(null);
        }
        else if (drawingRef.current === "points") {
          // Find the most recent point feature (last one added)
          const pointFeatures = features.features.filter(f => f.geometry.type === "Point");
          if (pointFeatures.length > 0) {
            const pointFeature = pointFeatures[pointFeatures.length - 1];
            if (pointFeature.geometry.type === "Point") {
              setInput({
                type: "points",
                coordinates: pointFeature.geometry.coordinates as number[],
              });
            }
          } else {
            console.error("Expected a Point geometry for points input");
            setInput(null);
          }
        } else if (drawingRef.current === "bounds-point") {
          // Find the most recent point feature (last one added)
          const pointFeatures = features.features.filter(f => f.geometry.type === "Point");
          if (pointFeatures.length > 0) {
            const pointFeature = pointFeatures[pointFeatures.length - 1];
            if (pointFeature.geometry.type === "Point") {
              setSelectedPoint({
                coordinates: pointFeature.geometry.coordinates as number[],
              });
            }
          } else {
            console.error("Expected a Point geometry for bounds point selection");
            setSelectedPoint(null);
          }
        }
      } else {
        console.log('No features found, clearing polygon and input');
        setPolygon(null);
        setInput(null);
      }
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []); // Removed mapProvider dependency

  // Handle map provider changes by updating the style without recreating the map
  useEffect(() => {
    if (!map.current) return;

    // Store current camera state
    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();
    const currentBearing = map.current.getBearing();
    const currentPitch = map.current.getPitch();

    // Create new style for the selected provider
    const newMapStyle = createBaseMapStyle({
      mapProvider,
      geobaseConfig: GEOBASE_CONFIG,
      mapboxConfig: MAPBOX_CONFIG,
    }, {
      includeMapboxBase: false,
      mapboxTileStyle: 'satellite',
      maxZoom: 22
    });

    // Update the map style while preserving camera state
    map.current.setStyle(newMapStyle, { diff: false });

    // Restore camera state after style loads
    map.current.once('styledata', () => {
      map.current?.setCenter(currentCenter);
      map.current?.setZoom(currentZoom);
      map.current?.setBearing(currentBearing);
      map.current?.setPitch(currentPitch);
    });
  }, [mapProvider]);

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
        task: "mask-generation",
      }],
      providerParams,
    });
  }, [mapProvider, initializeModel]);

  // Handle results from the worker
  useEffect(() => {
    // Handle results from the worker
    if (lastResult?.masks && map.current) {
      MapUtils.displayDetections(map.current, lastResult.masks);
      setDetections([lastResult.masks]);
    }
    if (lastResult?.geoRawImage?.bounds && map.current) {
      MapUtils.displayInferenceBounds(map.current, lastResult.geoRawImage.bounds);
    } 
    // Create bounds polygon from geoRawImage bounds if available
    if (lastResult?.geoRawImage?.bounds && !boundsPolygon) {
      const boundsFeature = boundsToPolygon(lastResult.geoRawImage.bounds);
      setBoundsPolygon(boundsFeature);
    }
  }, [lastResult, boundsPolygon]);


  const handleMaskGeneration = () => {
    if (!polygon) return;
    
    // Use selectedPoint if available, otherwise use regular input
    const inputPoint = selectedPoint ? {
      type: "points" as const,
      coordinates: selectedPoint.coordinates
    } : input;
    
    runInference({
      inputs : {
        polygon: polygon,
        input: inputPoint,
      },
      mapSourceParams : {
        zoomLevel
      },
      postProcessingParams:{
        maxMasks
      }
    })
  };

  const handleStartDrawing = () => {
    setDrawing("polygon");
    drawingRef.current = "polygon";
    if (draw.current) {
      draw.current.changeMode("draw_polygon");
    }
  };
  
  const handleStartDrawingInput = () => {
    // If bounds polygon is available and we're in points mode, use bounds-point mode
    if (boundsPolygon) {
      setDrawing("bounds-point");
      drawingRef.current = "bounds-point";
    } else {
      setDrawing("points");
      drawingRef.current = "points";
    }
    if(draw.current){
      draw.current.changeMode("draw_point");
    }

  };

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    // Also update the map zoom to match the slider
    if (map.current) {
      MapUtils.setZoom(map.current, newZoom);
    }
  };

  return (
    <main className="w-full h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 relative">
      <BackgroundEffects />
      {/* Sidebar */}
      <aside className="w-96 h-full flex flex-col overflow-hidden relative">
        <div className="backdrop-blur-xl bg-white/80 border-r border-gray-200/30 h-full shadow-2xl">
          <div className="p-6 flex flex-col gap-6 text-gray-800 overflow-y-auto h-full">
              <div className="space-y-3 relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg blur opacity-10"></div>
                <div className="relative backdrop-blur-sm bg-white/90 p-4 rounded-lg border border-green-200/50 shadow-sm">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Mask Generation
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Draw a polygon and point on the map and run mask generation within the selected area.
                  </p>
                </div>
              </div>

              {!polygon && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm">
                  Draw a polygon on the map to enable detection.
                </div>
              )}

              {boundsPolygon && !selectedPoint && (
                <div className="mt-2 p-3 bg-purple-50 border border-purple-200 text-purple-800 rounded-lg text-sm">
                  🎯 Bounds polygon is available! You can now select a point within the bounds to refine your mask generation.
                </div>
              )}

              {boundsPolygon && selectedPoint && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
                  ✓ Point selected within bounds! You can generate additional masks using this point.
                </div>
              )}

              <div className="space-y-4">
                <GlassmorphismCard glowColor="emerald">
                  <MapProviderSelector
                    value={mapProvider}
                    onChange={setMapProvider}
                  />
                </GlassmorphismCard>

                <div className="flex flex-col gap-3">
                  <GradientButton
                    variant="primary"
                    onClick={handleStartDrawing}
                    icon={PlusIcon}
                  >
                    Draw Area of Interest
                  </GradientButton>
                  

                  <div className="flex gap-2">
                    <GradientButton
                      variant="primary"
                      onClick={handleStartDrawingInput}
                      icon={PlusIcon}
                      disabled={!polygon || !isInitialized || isProcessing}
                    >
                      Draw Point
                    </GradientButton>
                    <GradientButton
                      variant="danger"
                      onClick={handleClearInput}
                      icon={ClearPoint}
                      disabled={!selectedPoint && !input}
                    >
                      Clear point
                    </GradientButton>
                  </div>
                  
                  <GradientButton
                    variant="secondary"
                    onClick={handleMaskGeneration}
                    disabled={!polygon || !isInitialized || isProcessing || (!input && !selectedPoint)}
                    loading={!isInitialized || isProcessing}
                    icon={!isInitialized || isProcessing ? undefined : PlayIcon}
                  >
                    {!isInitialized ? "Initializing AI..." : isProcessing ? "Generating Mask" : "Generate Mask"}
                  </GradientButton>
                  <GradientButton
                    variant="danger"
                    onClick={handleReset}
                    icon={ResetIcon}
                  >
                    Reset System
                  </GradientButton>
                </div>
              </div>
              {/* Detection Settings */}
              <GlassmorphismCard glowColor="teal">
                <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-teal-500 rounded-full mr-2 animate-pulse"></span>
                  Detection Parameters
                </h3>
                <ZoomSlider
                  value={zoomLevel}
                  onChange={handleZoomChange}
                  max={23}
                />
                <div className="space-y-4">
                  <label
                    htmlFor="maxMasks"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Max Masks (1-3)
                  </label>
                  <input
                    type="number"
                    id="maxMasks"
                    min="1"
                    max="3"
                    step="1"
                    value={maxMasks}
                    onChange={e =>
                      setMaxMasks(
                        Math.min(3, Math.max(1, Number(e.target.value)))
                      )
                    }
                    className="block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none sm:text-sm text-gray-900 px-3 py-2 transition-all border"
                  />
                </div>
              </GlassmorphismCard>

              {/* Label Input Section */}
              <GlassmorphismCard glowColor="teal">
                <h3 className="font-semibold text-gray-800 mb-2">Set Mask Label</h3>
                <div>
                  <input
                    type="text"
                    id="labelInput"
                    value={label}
                    onChange={(e) => setMaskLabel(e.target.value)}
                    placeholder="Enter a label for this mask generation"
                    className="block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none sm:text-sm text-gray-900 px-3 py-2 transition-all border"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Will default to timestamp if left empty
                  </p>
                </div>
              </GlassmorphismCard>

              {/* Status Messages */}
              {lastResult && (
                <StatusMessage
                  type="success"
                  message="Mask Geberation Complete!"
                />
              )}

              {error && (
                <StatusMessage
                  type="error"
                  message={error}
                />
              )}
          </div>
          
        </div>
      </aside>
      {/* Map */}
      <div className="flex-1 h-full relative">
        <div className="absolute inset-2 rounded-lg overflow-hidden border border-gray-200/50 shadow-2xl">
          <div ref={mapContainer} className="w-full h-full" />
        </div>
        <div className="absolute top-6 right-6 z-10">
            <ExportButton
              detections={detections && Array.isArray(detections) && detections.length > 0 
                ? {
                    type: "FeatureCollection" as const,
                    features: detections.flatMap((fc: GeoJSON.FeatureCollection) => fc.features)
                  }
                : undefined
              }
              geoRawImage={lastResult?.geoRawImage}
              task="mask-generation"
              provider={mapProvider}
              disabled={(!detections || !Array.isArray(detections) || detections.length === 0) && !lastResult?.geoRawImage}
              className="shadow-2xl backdrop-blur-lg"
            />
        </div>
        
        {/* Model Loading Progress - Floating in top center */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50">
          <TaskDownloadProgress
            task="mask-generation"
            className="min-w-80"
            isInitialized={isInitialized}
          />
        </div>
        {/* Corner decorations */}
        <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-green-400/40 rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-lg"></div>
      </div>
    </main>
  );
}

