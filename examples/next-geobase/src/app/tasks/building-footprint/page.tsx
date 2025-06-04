"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";
import type { StyleSpecification } from "maplibre-gl";

const GEOBASE_CONFIG = {
  provider: "geobase",
  projectRef: process.env.NEXT_PUBLIC_GEOBASE_PROJECT_REF,
  apikey: process.env.NEXT_PUBLIC_GEOBASE_API_KEY,
  cogImagery:
    "https://huggingface.co/datasets/giswqs/geospatial/resolve/main/naip_train.tif",
};

const MAPBOX_CONFIG = {
  provider: "mapbox",
  apiKey: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "test",
  style: "mapbox://styles/mapbox/satellite-v9",
};

// Add validation for required environment variables
if (!GEOBASE_CONFIG.projectRef || !GEOBASE_CONFIG.apikey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_GEOBASE_PROJECT_REF and/or NEXT_PUBLIC_GEOBASE_API_KEY"
  );
}

type MapProvider = "geobase" | "mapbox";

export default function BuildingFootPrintSegmentation() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MaplibreDraw | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [polygon, setPolygon] = useState<GeoJSON.Feature | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [detectionResult, setDetectionResult] = useState<string | null>(null);
  const [detections, setDetections] = useState<GeoJSON.FeatureCollection>();
  const [zoomLevel, setZoomLevel] = useState<number>(15);
  const [confidenceScore, setConfidenceScore] = useState<number>(0.5);
  const [minArea, setMinArea] = useState<number>(20);
//   const [selectedModel, setSelectedModel] = useState<string>(
//     "geobase/WALDO30_yolov8m_640x640"
//   );
  const [customModelId, setCustomModelId] = useState<string>("");
  const [mapProvider, setMapProvider] = useState<MapProvider>("mapbox");
//   const models = ["geobase/WALDO30_yolov8m_640x640"];

  const handleReset = () => {
    // Clear all drawn features
    if (draw.current) {
      draw.current.deleteAll();
    }

    // Remove detection layer if it exists
    if (map.current) {
      if (map.current.getSource("detections")) {
        map.current.removeLayer("detections-layer");
        map.current.removeSource("detections");
      }
    }

    // Reset states
    setPolygon(null);
    setDetections(undefined);
    setDetectionResult(null);
    setDetecting(false);
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapStyle: StyleSpecification = {
      version: 8 as const,
      sources: {
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
            `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.jpg90?access_token=${MAPBOX_CONFIG.apiKey}`,
          ],
          tileSize: 256,
        },
      },
      layers: [
        {
          id: "geobase-layer",
          type: "raster",
          source: "geobase-tiles",
          minzoom: 0,
          maxzoom: 22,
          layout: {
            visibility: mapProvider === "geobase" ? "visible" : "none",
          },
        },
        {
          id: "mapbox-layer",
          type: "raster",
          source: "mapbox-tiles",
          minzoom: 0,
          maxzoom: 22,
          layout: {
            visibility: mapProvider === "mapbox" ? "visible" : "none",
          },
        },
      ],
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [-117.41857614409385,
        47.656774236160146],
      zoom: zoomLevel,
    });

    // Add draw control
    draw.current = new MaplibreDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
    });
    map.current.addControl(draw.current, "top-left");

    // Listen for polygon creation
    map.current.on("draw.create", updatePolygon);
    map.current.on("draw.update", updatePolygon);
    map.current.on("draw.delete", () => setPolygon(null));

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

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../common.worker.ts", import.meta.url)
    );

    workerRef.current.onmessage = e => {
      const { type, payload } = e.data;

      switch (type) {
        case "init_complete":
          setInitializing(false);
          break;
        case "inference_complete":
          if (payload.detections) {
            setDetections(payload.detections);
            // Add the detections as a new layer on the map
            if (map.current) {
              // Remove existing detection layer if it exists
              if (map.current.getSource("detections")) {
                map.current.removeLayer("detections-layer");
                map.current.removeSource("detections");
              }

              // Add the new detections as a source
              map.current.addSource("detections", {
                type: "geojson",
                data: payload.detections,
              });

              // Add a layer to display the detections
              map.current.addLayer({
                id: "detections-layer",
                type: "fill",
                source: "detections",
                paint: {
                  "fill-color": "#FFD600",
                  "fill-opacity": 0.8,
                  "fill-outline-color": "#000000",
                },
              });

              // Add hover functionality
              const popup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
              });

              map.current.on("mouseenter", "detections-layer", () => {
                map.current!.getCanvas().style.cursor = "pointer";
              });

              map.current.on("mouseleave", "detections-layer", () => {
                map.current!.getCanvas().style.cursor = "";
                popup.remove();
              });

              map.current.on("mousemove", "detections-layer", e => {
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
            }
          }
          setDetecting(false);
          setDetectionResult("Building footprint segmentation complete!");
          break;
        case "error":
          setDetecting(false);
          setInitializing(false);
          setDetectionResult(`Error: ${payload}`);
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleDetect = async () => {
    if (!polygon || !workerRef.current) return;
    setDetecting(true);
    setInitializing(true);
    setDetectionResult(null);

    try {
      // Initialize model if needed
      workerRef.current.postMessage({
        type: "init",
        payload: {
            task: "building-footprint-segmentation",
          ...(mapProvider === "geobase" ? GEOBASE_CONFIG : MAPBOX_CONFIG),
        //   modelId: customModelId || selectedModel,
        },
      });

      // Wait for initialization to complete before running inference
      await new Promise<void>((resolve, reject) => {
        const messageHandler = (e: MessageEvent) => {
          const { type, payload } = e.data;
          if (type === "init_complete") {
            workerRef.current?.removeEventListener("message", messageHandler);
            resolve();
          } else if (type === "error") {
            workerRef.current?.removeEventListener("message", messageHandler);
            reject(new Error(payload));
          }
        };
        workerRef.current?.addEventListener("message", messageHandler);
      });

      // Now run inference
      workerRef.current.postMessage({
        type: "inference",
        payload: {
          task : "building-footprint-segmentation",
          polygon,
          confidenceScore,
          minArea,
          zoomLevel,
        },
      });
    } catch (error) {
      console.error("Detection error:", error);
      setDetecting(false);
      setInitializing(false);
      setDetectionResult(error instanceof Error ? error.message : "Error during detection. Please try again.");
    }
  };

  const handleStartDrawing = () => {
    if (draw.current) {
      draw.current.changeMode("draw_polygon");
    }
  };

  return (
    <main className="w-full h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-96 bg-white border-r border-gray-200 h-full flex flex-col overflow-hidden">
        <div className="p-6 flex flex-col gap-6 text-black shadow-lg overflow-y-auto">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-800">Building Footprint Segmentation</h2>
            <p className="text-sm text-gray-600">
              Draw a polygon on the map and run inference to detect building footprints in the specified area.
            </p>
          </div>

          {!polygon && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm">
              Draw a polygon on the map to enable detection.
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-800">Map Provider</h3>
              <div className="space-y-4">
                <div>
                  <select
                    id="mapProvider"
                    value={mapProvider}
                    onChange={(e) => setMapProvider(e.target.value as MapProvider)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  >
                    <option value="geobase">Geobase</option>
                    <option value="mapbox">Mapbox</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center gap-2 cursor-pointer"
                onClick={handleStartDrawing}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Draw Area of Interest
              </button>
              <button
                className="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={!polygon || detecting || initializing}
                onClick={handleDetect}
              >
                {detecting || initializing ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {initializing ? "Initializing Model..." : "Detecting..."}
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Run Detection
                  </>
                )}
              </button>
              <button
                className="bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium flex items-center justify-center gap-2 cursor-pointer"
                onClick={handleReset}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-800">Model Settings</h3>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="modelSelect"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Select Model
                  </label>
                  <select
                    id="modelSelect"
                    value={selectedModel}
                    onChange={e => {
                      setSelectedModel(e.target.value);
                      setCustomModelId("");
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  >
                    {models.map(model => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="customModel"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Or Enter Custom Model ID
                  </label>
                  <input
                    type="text"
                    id="customModel"
                    value={customModelId}
                    onChange={e => {
                      setCustomModelId(e.target.value);
                      setSelectedModel("");
                    }}
                    placeholder="Enter Hugging Face model ID"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  />
                </div>
              </div>
            </div> */}

            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-800">Detection Settings</h3>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="zoomLevel"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Zoom Level (0-22)
                  </label>
                  <input
                    type="number"
                    id="zoomLevel"
                    min="0"
                    max="22"
                    value={zoomLevel}
                    onChange={e =>
                      setZoomLevel(
                        Math.min(22, Math.max(0, Number(e.target.value)))
                      )
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confidenceScore"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Confidence Score (0-1)
                  </label>
                  <input
                    type="number"
                    id="confidenceScore"
                    min="0"
                    max="1"
                    step="0.1"
                    value={confidenceScore}
                    onChange={e =>
                      setConfidenceScore(
                        Math.min(1, Math.max(0, Number(e.target.value)))
                      )
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confidenceScore"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Min Area (pixels in mask)
                  </label>
                  <input
                    type="number"
                    id="confidenceScore"
                    min="0"
                    max="100"
                    step="1"
                    value={minArea}
                    onChange={e =>
                        setMinArea(
                        Math.min(1, Math.max(0, Number(e.target.value)))
                      )
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {detectionResult && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg">
              {detectionResult}
            </div>
          )}
          
        </div>
      </aside>
      {/* Map */}
      <div className="flex-1 h-full relative">
        <div ref={mapContainer} className="w-full h-full" />
      </div>
    </main>
  );
}

