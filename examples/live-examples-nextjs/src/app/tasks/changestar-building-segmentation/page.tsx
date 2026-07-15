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
import { ESRI_CONFIG, GEOBASE_CONFIG, MAPBOX_CONFIG } from "../../../config";
import { MapProvider } from "../../../types";
import { getOptimumZoom } from "@/utils/optimalParamsUtil";

GEOBASE_CONFIG.cogImagery =
  "https://huggingface.co/datasets/geobase/geoai-cogs/resolve/main/building-detection.tif";

const mapInitConfig = {
  center: [-117.59159209938863, 47.65325850830081] as [number, number],
  zoom: getOptimumZoom("changestar-building-segmentation", "geobase") || 16,
};

if (!GEOBASE_CONFIG.projectRef || !GEOBASE_CONFIG.apikey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_GEOBASE_PROJECT_REF and/or NEXT_PUBLIC_GEOBASE_API_KEY"
  );
}

export default function ChangeStarBuildingSegmentation() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MaplibreDraw | null>(null);

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
  const [detections, setDetections] = useState<GeoJSON.FeatureCollection>();
  const [zoomLevel, setZoomLevel] = useState<number>(18);
  const [mapProvider, setMapProvider] = useState<MapProvider>("geobase");
  const [drawWarning, setDrawWarning] = useState<string | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.5);

  const optimumZoom =
    getOptimumZoom("changestar-building-segmentation", mapProvider) ??
    mapInitConfig.zoom;

  const handleReset = () => {
    if (draw.current) {
      draw.current.deleteAll();
    }

    if (map.current) {
      MapUtils.clearAllLayers(map.current);
    }

    setPolygon(null);
    setDetections(undefined);
    clearError();
  };

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
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
      postProcessingParams: {
        confidenceThreshold,
      },
    });
  };

  const handleStartDrawing = () => {
    if (zoomLevel < optimumZoom - 1) {
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

    draw.current = new MaplibreDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
    });
    map.current.addControl(draw.current as any, "top-left");

    map.current.on("draw.create", updatePolygon);
    map.current.on("draw.update", updatePolygon);
    map.current.on("draw.delete", () => setPolygon(null));

    map.current.on("zoom", () => {
      if (map.current) {
        setZoomLevel(Math.round(map.current.getZoom()));
      }
    });

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
  }, []);

  useEffect(() => {
    if (!map.current) return;

    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();
    const currentBearing = map.current.getBearing();
    const currentPitch = map.current.getPitch();

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

    map.current.setStyle(newMapStyle, { diff: false });

    map.current.once("styledata", () => {
      map.current?.setCenter(currentCenter);
      map.current?.setZoom(currentZoom);
      map.current?.setBearing(currentBearing);
      map.current?.setPitch(currentPitch);
    });
  }, [mapProvider]);

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
      tasks: [
        {
          task: "changestar-building-segmentation",
        },
      ],
      providerParams,
    });
  }, [mapProvider, initializeModel]);

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

      <aside className="w-96 h-full flex flex-col overflow-hidden relative">
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
            title="ChangeStar Building Segmentation"
            description="Dense building segmentation with ChangeStar ViT-B soft probability maps"
            onStartDrawing={handleStartDrawing}
            onDetect={handleDetect}
            onReset={handleReset}
            onZoomChange={handleZoomChange}
            onMapProviderChange={setMapProvider}
            optimumZoom={optimumZoom}
          />

          <div className="px-4 pb-6">
            <GlassmorphismCard>
              <ConfidenceSlider
                value={confidenceThreshold}
                onChange={setConfidenceThreshold}
                min={0.1}
                max={0.9}
                step={0.05}
              />
              <p className="text-xs text-gray-500 mt-2">
                Probability threshold for binarizing the soft building mask
                (default 0.5).
              </p>
            </GlassmorphismCard>
          </div>
        </div>
      </aside>

      <div className="flex-1 h-full relative">
        <div className="absolute inset-2 rounded-lg overflow-hidden border border-gray-200/50 shadow-2xl">
          <div ref={mapContainer} className="w-full h-full" />
        </div>

        <div className="absolute top-6 right-6 z-10">
          <ExportButton
            detections={detections}
            geoRawImage={lastResult?.geoRawImage}
            task="changestar-building-segmentation"
            provider={mapProvider}
            disabled={!detections && !lastResult?.geoRawImage}
            className="shadow-2xl backdrop-blur-lg"
          />
        </div>

        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50">
          <TaskDownloadProgress
            task="changestar-building-segmentation"
            className="min-w-80"
            isInitialized={isInitialized}
          />
        </div>

        <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-green-400/40 rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-lg"></div>

        <CollapsibleAttribution position="bottom-left" />
      </div>
    </main>
  );
}
