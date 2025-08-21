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
import { createBaseMapStyle } from "../../../utils/mapStyleUtils";
import { MapProvider } from "../../../types"
import { ESRI_CONFIG, GEOBASE_CONFIG, MAPBOX_CONFIG } from "../../../config";
import { getOptimumZoom } from "@/utils/optimalParamsUtil";

GEOBASE_CONFIG.cogImagery = "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/68917a624c782f9c3fbde513/0/68917a624c782f9c3fbde514.tif"

const mapInitConfig = {
  center: [-99.98154044151306,50.642806912434835] as [number, number],
  zoom: getOptimumZoom("land-cover-classification","geobase") || 20,
}

// Add validation for required environment variables
if (!GEOBASE_CONFIG.projectRef || !GEOBASE_CONFIG.apikey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_GEOBASE_PROJECT_REF and/or NEXT_PUBLIC_GEOBASE_API_KEY"
  );
}

export default function LandCoverClassification() {
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
  const [classifications, setClassifications] = useState<any>();
  const [zoomLevel, setZoomLevel] = useState<number>(mapInitConfig.zoom);
  const [mapProvider, setMapProvider] = useState<MapProvider>("geobase");
  const [showDetections, setShowDetections] = useState(false);
  const [drawWarning, setDrawWarning] = useState<string | null>(null);
  
    // Dynamic optimum zoom computed per provider (used for guiding drawing)
    const optimumZoom = getOptimumZoom("land-cover-classification", mapProvider) ?? mapInitConfig.zoom;


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
    setClassifications(undefined);
    clearError();
  };

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    // Also update the map zoom to match the slider
    if (map.current) {
      MapUtils.setZoom(map.current, newZoom);
    }
  };

  const handleStartDrawing = () => {
    if (zoomLevel < optimumZoom) {
      setDrawWarning(`Zoom in to at least ${optimumZoom} to draw a reliable detection zone.`);
      // Clear the warning after a short delay
      window.setTimeout(() => setDrawWarning(null), 500);
      return;
    }
    if (draw.current) {
      draw.current.changeMode("draw_polygon");
    }
  };

  useEffect(() => {
    if (!map.current || !lastResult?.outputImage) return;
  
    const { width, height, data, bounds, channels } = lastResult.outputImage;
    const [west, south, east, north] = [
      bounds.west,
      bounds.south,
      bounds.east,
      bounds.north,
    ];
  
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
  
    const imageData = ctx.createImageData(width, height);
    const imageArray = imageData.data;
  
    for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
      imageArray[j] = data[i];     // R
      imageArray[j + 1] = data[i + 1]; // G
      imageArray[j + 2] = data[i + 2]; // B
      imageArray[j + 3] = 255;     // A
    }
  
    ctx.putImageData(imageData, 0, 0);
    const dataURL = canvas.toDataURL();
  
    const sourceId = "geoai-rawimage";
    const layerId = "geoai-rawimage-layer";
  
    // Remove existing layer if exists
    if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
    if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
  
    // Add image source
    map.current.addSource(sourceId, {
      type: "image",
      url: dataURL,
      coordinates: [
        [west, north],
        [east, north],
        [east, south],
        [west, south],
      ],
    });
  
    // Add raster layer
    map.current.addLayer({
      id: layerId,
      type: "raster",
      source: sourceId,
      paint: {
        "raster-opacity": 0.85,
      },
    });
  
  }, [lastResult?.outputImage]);
  

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
        task: "land-cover-classification"
      }],
      providerParams,
    });
  }, [mapProvider, initializeModel]);

  // Handle results from the worker
  useEffect(() => {
    if (lastResult?.detections && map.current && showDetections) {
      displayDetections(lastResult.detections);
      setClassifications(lastResult.detections);
    }
    if (lastResult?.outputImage?.bounds && map.current) {
      MapUtils.displayInferenceBounds(map.current, lastResult.outputImage.bounds);
    }
  }, [lastResult]);

  // Function to display detections on the map
  const displayDetections = (detections: any) => {
    console.log("Received detections:", detections);
    
    // Validate that we have an array of FeatureCollections
    if (!Array.isArray(detections)) {
      console.error("Expected array of FeatureCollections:", detections);
      return;
    }

    setClassifications(detections);
    
    if (!map.current) return;

    // Remove existing detection layers if they exist
    detections.forEach((_: GeoJSON.FeatureCollection, index: number) => {
      const layerId = `detections-layer-${index}`;
      const sourceId = `detections-source-${index}`;
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });

    // Generate a color for each feature collection
    const colors = [
      '#FF0000', // Red
      '#00FF00', // Green
      '#0000FF', // Blue
      '#FFFF00', // Yellow
      '#FF00FF', // Magenta
      '#00FFFF', // Cyan
      '#FFA500', // Orange
      '#800080', // Purple
      '#008000', // Dark Green
      '#000080', // Navy
    ];

    // Add each feature collection as a separate layer
    detections.forEach((featureCollection: GeoJSON.FeatureCollection, index: number) => {
      const layerId = `detections-layer-${index}`;
      const sourceId = `detections-source-${index}`;
      const color = colors[index % colors.length];

      // Add the new detections as a source
      map.current?.addSource(sourceId, {
        type: "geojson",
        data: featureCollection,
      });

      // Add a layer to display the detections
      map.current?.addLayer({
        id: layerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": color,
          "fill-opacity": 0.9,
          "fill-outline-color": color,
        },
      });

      // Add hover functionality for each layer
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
      });

      map.current?.on("mouseenter", layerId, () => {
        map.current!.getCanvas().style.cursor = "pointer";
      });

      map.current?.on("mouseleave", layerId, () => {
        map.current!.getCanvas().style.cursor = "";
        popup.remove();
      });

      map.current?.on("mousemove", layerId, e => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const properties = feature.properties;

          // Create HTML content for popup
          const content = Object.entries(properties)
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join("<br/>");

          popup
            .setLngLat(e.lngLat)
            .setHTML(content)
            .addTo(map.current!);
        }
      });
    });
  };

  const handleClassify = () => {
    if (!polygon) return;

    runInference(
      {
        inputs: {
          polygon,
        },
        mapSourceParams: {
          zoomLevel : zoomLevel < optimumZoom ? optimumZoom : zoomLevel,
        },
        postProcessingParams: {
          minArea: 20
        }
      }
    );
  };

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
            drawWarning={drawWarning}
            title="Land Cover Classification"
            description="Advanced geospatial AI powered land cover classification system"
            onStartDrawing={handleStartDrawing}
            onDetect={handleClassify}
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
        <div className="absolute inset-2 rounded-lg overflow-hidden border border-gray-200/50 shadow-2xl">
          <div ref={mapContainer} className="w-full h-full" />
        </div>
        
        {/* Export Button - Floating in top right corner */}
        <div className="absolute top-6 right-6 z-10">
          <ExportButton
            detections={classifications && Array.isArray(classifications) && classifications.length > 0 
              ? {
                  type: "FeatureCollection" as const,
                  features: classifications.flatMap((fc: GeoJSON.FeatureCollection) => fc.features)
                }
              : undefined
            }
            geoRawImage={lastResult?.geoRawImage}
            task="land-cover-classification"
            provider={mapProvider}
            disabled={(!classifications || !Array.isArray(classifications) || classifications.length === 0) && !lastResult?.geoRawImage}
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

