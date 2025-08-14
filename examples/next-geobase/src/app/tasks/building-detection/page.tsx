"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";
import type { StyleSpecification } from "maplibre-gl";
import { useGeoAIWorker } from "../../../hooks/useGeoAIWorker";
import { 
  DetectionControls, 
  BackgroundEffects,
  ExportButton
} from "../../../components";
import { MapUtils } from "../../../utils/mapUtils";
import { ESRI_CONFIG, GEOBASE_CONFIG, MAPBOX_CONFIG, TMS_CONFIG } from "../../../config";
import { MapProvider } from "../../../types"

GEOBASE_CONFIG.cogImagery = "https://huggingface.co/datasets/giswqs/geospatial/resolve/main/naip_train.tif"

const mapInitConfig = {
  // center: [-117.59159209938863, 47.65325850830081] as [number, number],
  // berlin:
  center: [13.38, 52.51] as [number, number],
  zoom: 18,
}


// Add validation for required environment variables
if (!GEOBASE_CONFIG.projectRef || !GEOBASE_CONFIG.apikey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_GEOBASE_PROJECT_REF and/or NEXT_PUBLIC_GEOBASE_API_KEY"
  );
}

export default function BuildingDetection() {
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
  const [detections, setDetections] = useState<GeoJSON.FeatureCollection>();
  const [zoomLevel, setZoomLevel] = useState<number>(18);
  const [mapProvider, setMapProvider] = useState<MapProvider>("geobase");

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
    
    runInference(
      {
        inputs: {
          polygon,
        },
        mapSourceParams: {
         zoomLevel,
        },
      }
    );
  };

  const handleStartDrawing = () => {
    if (draw.current) {
      draw.current.changeMode("draw_polygon");
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapStyle: StyleSpecification = {
      version: 8 as const,
      sources: {
        "mapbox-base": {
          type: "raster",
          tiles: [
            `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_CONFIG.apiKey}`,
          ],
          tileSize: 512,
        },
        "geobase-tiles": {
          type: "raster",
          tiles: [
            `https://${GEOBASE_CONFIG.projectRef}.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${GEOBASE_CONFIG.cogImagery}&apikey=${GEOBASE_CONFIG.apikey}`,
          ],
          tileSize: 256,
        },
        "mapbox-tiles": {
          type: "raster",
          tiles: [
            `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${MAPBOX_CONFIG.apiKey}`,
          ],
          tileSize: 512,
        },
        "esri-tiles": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "ESRI World Imagery",
        },
        "tms-tiles": {
          type: "raster",
          tiles: [
            `${TMS_CONFIG.baseUrl}/{z}/{x}/{y}.${TMS_CONFIG.extension}?key=${TMS_CONFIG.apiKey}`,
          ],
          tileSize: 256,
          attribution: TMS_CONFIG.attribution,
        },
      },
      layers: [
        {
          id: "mapbox-base-layer",
          type: "raster",
          source: "mapbox-base",
          minzoom: 0,
          maxzoom: 23,
          layout: {
            visibility: mapProvider === "geobase" ? "visible" : "none",
          },
        },
        {
          id: "geobase-layer",
          type: "raster",
          source: "geobase-tiles",
          minzoom: 0,
          maxzoom: 23,
          layout: {
            visibility: mapProvider === "geobase" ? "visible" : "none",
          },
        },
        {
          id: "mapbox-layer",
          type: "raster",
          source: "mapbox-tiles",
          minzoom: 0,
          maxzoom: 23,
          layout: {
            visibility: mapProvider === "mapbox" ? "visible" : "none",
          },
        },
        {
          id: "esri-layer",
          type: "raster",
          source: "esri-tiles",
          minzoom: 0,
          maxzoom: 23,
          layout: {
            visibility: mapProvider === "esri" ? "visible" : "none",
          },
        },
        {
          id: "tms-layer",
          type: "raster",
          source: "tms-tiles",
          minzoom: 0,
          maxzoom: 23,
          layout: {
            visibility: mapProvider === "tms" ? "visible" : "none",
          },
        },
      ],
    };

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
  }, [mapProvider]);

  // Initialize the model when the map provider changes
  useEffect(() => {
    let providerParams;
    if (mapProvider === "geobase") {
      providerParams = GEOBASE_CONFIG;
    } else if (mapProvider === "esri") {
      providerParams = ESRI_CONFIG;
    } else if (mapProvider === "tms") {
      providerParams = TMS_CONFIG;
    } else {
      providerParams = MAPBOX_CONFIG;
    }

    initializeModel({
      tasks: [{
        task: "building-detection"
      }],
      providerParams,
    });
  }, [mapProvider, initializeModel]);

  // Handle results from the worker
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

      {/* Sidebar */}
      <aside className="w-96 h-full flex flex-col overflow-hidden relative">
        {/* Glassmorphism sidebar */}
        <div className="backdrop-blur-xl bg-white/80 border-r border-gray-200/30 h-full shadow-2xl">
          <DetectionControls
            polygon={polygon}
            isInitialized={isInitialized}
            isProcessing={isProcessing}
            zoomLevel={zoomLevel}
            mapProvider={mapProvider}
            lastResult={lastResult}
            error={error}
            title="Building Detection"
            description="Advanced geospatial AI powered building detection system"
            onStartDrawing={handleStartDrawing}
            onDetect={handleDetect}
            onReset={handleReset}
            onZoomChange={handleZoomChange}
            onMapProviderChange={setMapProvider}
          />
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
            task="building-detection"
            provider={mapProvider}
            disabled={!detections && !lastResult?.geoRawImage}
            className="shadow-2xl backdrop-blur-lg"
          />
        </div>
        
        {/* Corner decorations */}
        <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-green-400/40 rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-lg"></div>
      </div>
    </main>
  );
}

