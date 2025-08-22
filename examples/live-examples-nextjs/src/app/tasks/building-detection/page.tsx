"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";
import type { StyleSpecification } from "maplibre-gl";
import { useGeoAIWorker } from "../../../hooks/useGeoAIWorker";
import { 
  DetectionControls, 
  BackgroundEffects,
  ExportButton,
  TaskDownloadProgress
} from "../../../components";
import { MapUtils } from "../../../utils/mapUtils";
import { createBaseMapStyle } from "../../../utils/mapStyleUtils";
import { ESRI_CONFIG, GEOBASE_CONFIG, MAPBOX_CONFIG } from "../../../config";
import { MapProvider } from "../../../types"
import { getOptimumZoom } from "@/utils/optimalParamsUtil";

GEOBASE_CONFIG.cogImagery = "https://huggingface.co/datasets/geobase/geoai-cogs/resolve/main/building-detection.tif"

const mapInitConfig = {
  center: [-117.59159209938863, 47.65325850830081] as [number, number],
  zoom: getOptimumZoom("building-detection","geobase") || 18
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
  // Keep a ref to the Maplibre attribution control so we can (re)attach it when styles change
  const attrControl = useRef<maplibregl.AttributionControl | null>(null);

  // Attribution HTML used in the map's attribution control
  const attributionHTML = `Imagery: <a href="https://opengeoai.org/" target="_blank" rel="noreferrer" className="underline">geoai</a>`;

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
  const [drawWarning, setDrawWarning] = useState<string | null>(null);
  
    // Dynamic optimum zoom computed per provider (used for guiding drawing)
    const optimumZoom = getOptimumZoom("building-detection", mapProvider) ?? mapInitConfig.zoom;

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
         zoomLevel: zoomLevel < optimumZoom ? optimumZoom : zoomLevel,
        },
      }
    );
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

    const mapStyle = createBaseMapStyle({
      mapProvider,
      geobaseConfig: GEOBASE_CONFIG,
      mapboxConfig: MAPBOX_CONFIG,
    }, {
      includeMapboxBase: true,
      mapboxTileStyle: 'satellite-v9',
      maxZoom: 23
    });

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: mapInitConfig.center,
      zoom: mapInitConfig.zoom,
    });

    // Add Maplibre attribution control (uses the built-in attribution UI instead of a custom div)
    attrControl.current = new maplibregl.AttributionControl({ compact: false, customAttribution: attributionHTML });
    map.current.addControl(attrControl.current, 'bottom-left');
    // Ensure the attribution control DOM contains our HTML (fixes cases where it's rendered empty)
    try {
      const el = map.current.getContainer().querySelector('.maplibregl-ctrl-attrib');
      if (el) el.innerHTML = attributionHTML;
    } catch (e) {
      // ignore
    }

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
    const newMapStyle = createBaseMapStyle({
      mapProvider,
      geobaseConfig: GEOBASE_CONFIG,
      mapboxConfig: MAPBOX_CONFIG,
    }, {
      includeMapboxBase: true,
      mapboxTileStyle: 'satellite-v9',
      maxZoom: 23
    });

    // Update the map style while preserving camera state
    map.current.setStyle(newMapStyle, { diff: false });

    // Restore camera state after style loads
    map.current.once('styledata', () => {
      map.current?.setCenter(currentCenter);
      map.current?.setZoom(currentZoom);
      map.current?.setBearing(currentBearing);
      map.current?.setPitch(currentPitch);

      // Re-add (or refresh) our attribution control after style changes to ensure it is present
      if (map.current) {
        try {
          if (attrControl.current) {
            map.current.removeControl(attrControl.current);
          }
        } catch (e) {
          // ignore
        }
        attrControl.current = new maplibregl.AttributionControl({ compact: false, customAttribution: attributionHTML });
        map.current.addControl(attrControl.current, 'bottom-left');
        // Ensure the attribution control DOM contains our HTML after style changes
        try {
          const el = map.current.getContainer().querySelector('.maplibregl-ctrl-attrib');
          if (el) el.innerHTML = attributionHTML;
        } catch (e) {
          // ignore
        }
      }
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
      {/* Maplibre AttributionControl only — no manual fallback */}
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
            drawWarning={drawWarning}
            title="Building Detection"
            description="Advanced geospatial AI powered building detection system"
            onStartDrawing={handleStartDrawing}
            onDetect={handleDetect}
            onReset={handleReset}
            onZoomChange={handleZoomChange}
            onMapProviderChange={setMapProvider}
            optimumZoom={optimumZoom}
          />
        </div>
      </aside>

      {/* Map Container */}
      <div className="flex-1 h-full relative">
        {/* Map overlay with subtle border */}
        <div className="absolute inset-2 rounded-lg overflow-hidden border border-gray-200/50 shadow-2xl z-0">
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
        
        {/* Model Loading Progress - Floating in top center */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50">
          <TaskDownloadProgress
            task="building-detection"
            className="min-w-80"
            isInitialized={isInitialized}
          />
        </div>
        
        {/* Corner decorations */}
        <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-green-400/40 rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-lg"></div>

        {/* {mapProvider === "geobase" && (<div className="absolute bottom-6 left-6 z-40 text-xs text-white bg-black/60 backdrop-blur-sm rounded px-3 py-1">
          <span>
            Imagery: <a href="https://opengeoai.org/" target="_blank" rel="noreferrer" className="underline">geoai</a> 
          </span>
        </div>)} */}
      </div>
    </main>
  );
}

