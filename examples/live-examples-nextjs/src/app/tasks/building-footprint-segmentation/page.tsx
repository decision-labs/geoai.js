"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";
import { useGeoAIWorker } from "../../../hooks/useGeoAIWorker";
import {
  DetectionControls,
  BackgroundEffects,
  ExportButton,
  TaskDownloadProgress,
  CollapsibleAttribution,
  GlassmorphismCard,
} from "../../../components";
import { ConfidenceSlider } from "../../../components/ui/ConfidenceSlider";
import { MapUtils } from "../../../utils/mapUtils";
import { createBaseMapStyle } from "../../../utils/mapStyleUtils";
import { GEOBASE_CONFIG, MAPBOX_CONFIG } from "../../../config";
import { getProviderParams, restoreCameraAfterProviderChange } from "../../../utils/providerConfig";
import { MapProvider } from "../../../types"
import { getOptimumZoom } from "../../../utils/optimalParamsUtil";
import { TaskType } from "../../../utils/modelSizes";

GEOBASE_CONFIG.cogImagery =
  "https://huggingface.co/datasets/geobase/geoai-cogs/resolve/main/building-detection.tif";

const CHANGESTAR_MODEL_ID =
  "geobase/changestar-building-segmentation-vitb";

type FootprintModel = "default" | "changestar";

const mapInitConfig = {
  center: [-117.41857614409385, 47.656774236160146] as [number, number],
  zoom: getOptimumZoom("building-footprint-segmentation", "geobase") || 15,
};

// Add validation for required environment variables
if (!GEOBASE_CONFIG.projectRef || !GEOBASE_CONFIG.apikey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_GEOBASE_PROJECT_REF and/or NEXT_PUBLIC_GEOBASE_API_KEY"
  );
}

export default function BuildingFootPrintSegmentation() {
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
  } = useGeoAIWorker();

  // Component state
  const [polygon, setPolygon] = useState<GeoJSON.Feature | null>(null);
  const [detections, setDetections] = useState<GeoJSON.FeatureCollection>();
  const [zoomLevel, setZoomLevel] = useState<number>(15);
  const [mapProvider, setMapProvider] = useState<MapProvider>("mapbox");
  const [drawWarning, setDrawWarning] = useState<string | null>(null);
  const [footprintModel, setFootprintModel] =
    useState<FootprintModel>("changestar");
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.5);

  const isChangeStar = footprintModel === "changestar";
  const downloadTask: TaskType = isChangeStar
    ? "changestar-building-segmentation"
    : "building-footprint-segmentation";

  // Dynamic optimum zoom computed per provider (used for guiding drawing)
  const optimumZoom =
    getOptimumZoom("building-footprint-segmentation", mapProvider) ??
    mapInitConfig.zoom;

  const handleReset = () => {
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
    setDetections(undefined);
    clearError();
  };

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    // Also update the map zoom to match the slider
    if (map.current) {
      MapUtils.setZoom(map.current, newZoom);
    }
  };

  const handleDetect = () => {
    if (!polygon) return;

    runInference({
      inputs: {
        polygon,
      },
      mapSourceParams: {
        zoomLevel: zoomLevel < optimumZoom ? optimumZoom : zoomLevel,
      },
      postProcessingParams: isChangeStar
        ? { confidenceThreshold }
        : { confidenceThreshold, minArea: 20 },
    });
  };

  const handleStartDrawing = () => {
    if (zoomLevel < optimumZoom - 1) {
      // Clear the warning after a short delay
      window.setTimeout(() => setDrawWarning(null), 500);
      return;
    }
    if (draw.current) {
      draw.current.changeMode("draw_polygon");
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapStyle = createBaseMapStyle(
      {
        mapProvider,
        geobaseConfig: GEOBASE_CONFIG,
        mapboxConfig: MAPBOX_CONFIG,
      },
      {
        includeMapboxBase: true,
        mapboxTileStyle: "satellite-v9",
        maxZoom: 23,
      }
    );

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

    // Listen for polygon creation
    map.current.on("draw.create", updatePolygon);
    map.current.on("draw.update", updatePolygon);
    map.current.on("draw.delete", () => setPolygon(null));

    // Listen for zoom changes to sync with slider
    map.current.on("zoom", () => {
      if (map.current) {
        const currentZoom = Math.round(map.current.getZoom());
        setZoomLevel(currentZoom);
      }
    });

    // Initialize zoom level with current map zoom
    setZoomLevel(Math.round(map.current.getZoom()));

    function updatePolygon() {
      const features = draw.current?.getAll();
      if (features && features.features.length > 0) {
        setPolygon(features.features[0]);
      } else {
        setPolygon(null);
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
    const newMapStyle = createBaseMapStyle(
      {
        mapProvider,
        geobaseConfig: GEOBASE_CONFIG,
        mapboxConfig: MAPBOX_CONFIG,
      },
      {
        includeMapboxBase: true,
        mapboxTileStyle: "satellite-v9",
        maxZoom: 23,
      }
    );

    // Update the map style while preserving camera state
    map.current.setStyle(newMapStyle, { diff: false });

    // Restore camera state after style loads
    map.current.once('styledata', () => {
      if (!map.current) return;
      restoreCameraAfterProviderChange(map.current, mapProvider, {
        center: currentCenter,
        zoom: currentZoom,
        bearing: currentBearing,
        pitch: currentPitch,
      });
    });
  }, [mapProvider]);

  // Initialize the model when the map provider or footprint model changes
  useEffect(() => {
    const providerParams = getProviderParams(mapProvider, {
      cogImagery: GEOBASE_CONFIG.cogImagery,
    });

    const taskConfig = isChangeStar
      ? {
          task: "building-footprint-segmentation",
          modelId: CHANGESTAR_MODEL_ID,
          modelParams: { dtype: "fp32", device: "webgpu" },
        }
      : {
          task: "building-footprint-segmentation",
        };

    initializeModel({
      tasks: [taskConfig],
      providerParams,
    });
  }, [mapProvider, footprintModel, isChangeStar, initializeModel]);

  // Handle results from the worker
  useEffect(() => {
    if (lastResult?.detections && map.current) {
      MapUtils.displayDetections(map.current, lastResult.detections);
      setDetections(lastResult.detections);
    }
    if (lastResult?.geoRawImage?.bounds && map.current) {
      MapUtils.displayInferenceBounds(
        map.current,
        lastResult.geoRawImage.bounds
      );
    }
  }, [lastResult]);

  return (
    <main className="w-full h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 relative">
      <BackgroundEffects />

      {/* Sidebar */}
      <aside className="w-96 h-full flex flex-col overflow-hidden relative">
        {/* Glassmorphism sidebar */}
        <div className="backdrop-blur-xl bg-white/80 border-r border-gray-200/30 h-full shadow-2xl overflow-y-auto">
          <DetectionControls
            polygon={polygon}
            isInitialized={isInitialized}
            isProcessing={isProcessing}
            zoomLevel={zoomLevel}
            mapProvider={mapProvider}
            lastResult={lastResult}
            error={error}
            drawWarning={drawWarning}
            title="Building Footprint Segmentation"
            description="Extract building footprints — default model or ChangeStar ViT-B"
            onStartDrawing={handleStartDrawing}
            onDetect={handleDetect}
            onReset={handleReset}
            onZoomChange={handleZoomChange}
            onMapProviderChange={setMapProvider}
            optimumZoom={optimumZoom}
          />

          <div className="px-4 pb-6 space-y-4">
            <GlassmorphismCard>
              <p className="text-sm font-medium text-gray-700 mb-3">Model</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="footprint-model"
                    checked={footprintModel === "default"}
                    onChange={() => setFootprintModel("default")}
                    disabled={isProcessing}
                  />
                  Default (lighter)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="footprint-model"
                    checked={footprintModel === "changestar"}
                    onChange={() => setFootprintModel("changestar")}
                    disabled={isProcessing}
                  />
                  ChangeStar ViT-B (~377MB)
                </label>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard>
              <ConfidenceSlider
                value={confidenceThreshold}
                onChange={setConfidenceThreshold}
                min={0.1}
                max={0.9}
                step={0.05}
              />
            </GlassmorphismCard>
          </div>
        </div>
      </aside>

      {/* Map Container */}
      <div className="flex-1 h-full relative">
        {/* Map overlay with subtle border */}
        <div className="absolute inset-2 rounded-lg overflow-hidden border border-gray-200/50 shadow-2xl">
          <div ref={mapContainer} className="w-full h-full" />
        </div>

        {/* Export Button - Floating in top right corner */}
        <div className="absolute top-6 right-6 z-10">
          <ExportButton
            detections={detections}
            geoRawImage={lastResult?.geoRawImage}
            task="building-footprint-segmentation"
            provider={mapProvider}
            disabled={!detections && !lastResult?.geoRawImage}
            className="shadow-2xl backdrop-blur-lg"
          />
        </div>

        {/* Model Loading Progress - Floating in top center */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50">
          <TaskDownloadProgress
            task={downloadTask}
            className="min-w-80"
            isInitialized={isInitialized}
          />
        </div>

        {/* Corner decorations */}
        <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-green-400/40 rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-lg"></div>

        <CollapsibleAttribution position="bottom-left" />
      </div>
    </main>
  );
}
