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
} from "../../../components";
import { MapUtils } from "../../../utils/mapUtils";
import { createBaseMapStyle } from "../../../utils/mapStyleUtils";
import { GEOBASE_CONFIG, MAPBOX_CONFIG } from "../../../config";
import { getOptimumZoom } from "@/utils/optimalParamsUtil";

GEOBASE_CONFIG.cogImagery =
  "https://huggingface.co/datasets/geobase/geoai-cogs/resolve/main/wetland-segmentation.tif";

const MAP_PROVIDER = "geobase" as const;

const mapInitConfig = {
  center: [-99.0983079371952, 46.60892272965549] as [number, number],
  zoom: getOptimumZoom("wetland-segmentation", MAP_PROVIDER) || 18,
};

const optimumZoom =
  getOptimumZoom("wetland-segmentation", MAP_PROVIDER) ?? mapInitConfig.zoom;

if (!GEOBASE_CONFIG.projectRef || !GEOBASE_CONFIG.apikey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_GEOBASE_PROJECT_REF and/or NEXT_PUBLIC_GEOBASE_API_KEY"
  );
}

export default function WetLandSegmentation() {
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
  const [zoomLevel, setZoomLevel] = useState<number>(optimumZoom);
  const [drawWarning, setDrawWarning] = useState<string | null>(null);

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
    });
  };

  const handleStartDrawing = () => {
    if (zoomLevel < optimumZoom - 1) {
      setDrawWarning(
        `Zoom to at least level ${optimumZoom} before drawing a detection zone.`
      );
      window.setTimeout(() => setDrawWarning(null), 5000);
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
        mapProvider: MAP_PROVIDER,
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
    initializeModel({
      tasks: [
        {
          task: "wetland-segmentation",
        },
      ],
      providerParams: GEOBASE_CONFIG,
    });
  }, [initializeModel]);

  useEffect(() => {
    if (lastResult?.detections && map.current) {
      MapUtils.displayDetections(map.current, lastResult.detections);
      setDetections(lastResult.detections);
    }
    if (lastResult?.geoRawImage?.bounds && map.current) {
      MapUtils.displayInferenceBounds(map.current, lastResult.geoRawImage.bounds);
    }
  }, [lastResult]);

  return (
    <main className="w-full h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 relative">
      <BackgroundEffects />

      <aside className="w-96 h-full flex flex-col overflow-hidden relative">
        <div className="backdrop-blur-xl bg-white/80 border-r border-gray-200/30 h-full shadow-2xl">
          <DetectionControls
            polygon={polygon}
            isInitialized={isInitialized}
            isProcessing={isProcessing}
            zoomLevel={zoomLevel}
            mapProvider={MAP_PROVIDER}
            lastResult={lastResult}
            error={error}
            drawWarning={drawWarning}
            title="Wetland Segmentation"
            description="Segments wetlands from 4-band multispectral COG imagery. Only Geobase supports the required tile format."
            allowedMapProviders={[MAP_PROVIDER]}
            onStartDrawing={handleStartDrawing}
            onDetect={handleDetect}
            onReset={handleReset}
            onZoomChange={handleZoomChange}
            onMapProviderChange={() => {}}
            optimumZoom={optimumZoom}
          />
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
            task="wetland-segmentation"
            provider={MAP_PROVIDER}
            disabled={!detections && !lastResult?.geoRawImage}
            className="shadow-2xl backdrop-blur-lg"
          />
        </div>

        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50">
          <TaskDownloadProgress
            task="wetland-segmentation"
            className="min-w-80"
            isInitialized={isInitialized}
            error={error}
          />
        </div>

        <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-green-400/40 rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-lg"></div>

        <CollapsibleAttribution position="bottom-left" />
      </div>
    </main>
  );
}
