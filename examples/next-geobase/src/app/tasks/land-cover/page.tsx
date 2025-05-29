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
    "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/67ba1d2bec9237a9ebd358a3/0/67ba1d2bec9237a9ebd358a4.tif",
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

export default function LandCoverClassification() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MaplibreDraw | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [polygon, setPolygon] = useState<GeoJSON.Feature | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [classificationResult, setClassificationResult] = useState<string | null>(null);
  const [classifications, setClassifications] = useState<GeoJSON.FeatureCollection>();
  const [zoomLevel, setZoomLevel] = useState<number>(22);
  const [confidenceScore, setConfidenceScore] = useState<number>(0.9);
  const [selectedModel, setSelectedModel] = useState<string>(
    "geobase/land-cover-classification"
  );
  const [customModelId, setCustomModelId] = useState<string>("");
  const [mapProvider, setMapProvider] = useState<MapProvider>("geobase");
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<string | null>(null);
  const models = ["geobase/land-cover-classification"];

  const handleReset = () => {
    if (draw.current) {
      draw.current.deleteAll();
    }

    if (map.current) {
      if (map.current.getSource("classifications")) {
        map.current.removeLayer("classifications-layer");
        map.current.removeSource("classifications");
      }
    }

    setPolygon(null);
    setClassifications(undefined);
    setClassificationResult(null);
    setClassifying(false);
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
      center: [114.84857638295142, -3.449805712621256],
      zoom: 18,
    });

    draw.current = new MaplibreDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
    }) as unknown as MaplibreDraw;
    map.current.addControl(draw.current, "top-left");

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

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../common.worker.ts", import.meta.url)
    );

    workerRef.current.onmessage = e => {
      const { type, payload } = e.data;
      console.log("Worker message received:", type, payload);

      switch (type) {
        case "init_complete":
          setInitializing(false);
          break;
        case "inference_complete":
          if (payload.detections) {
            console.log("Received detections:", payload.detections);
            
            // Validate that we have an array of FeatureCollections
            if (!Array.isArray(payload.detections)) {
              console.error("Expected array of FeatureCollections:", payload.detections);
              setClassificationResult("Error: Invalid detection results format");
              setClassifying(false);
              setDetecting(false);
              break;
            }

            // Merge all FeatureCollections into a single one
            const mergedFeatures = payload.detections.reduce((acc: GeoJSON.Feature[], collection: GeoJSON.FeatureCollection) => {
              if (collection.type === "FeatureCollection" && Array.isArray(collection.features)) {
                return [...acc, ...collection.features];
              }
              return acc;
            }, []);

            const geojsonData: GeoJSON.FeatureCollection = {
              type: "FeatureCollection",
              features: mergedFeatures
            };

            console.log("Merged GeoJSON data:", geojsonData);

            setClassifications(geojsonData);
            if (map.current) {
              try {
                if (map.current.getSource("classifications")) {
                  map.current.removeLayer("classifications-layer");
                  map.current.removeSource("classifications");
                }

                map.current.addSource("classifications", {
                  type: "geojson",
                  data: geojsonData
                });

                map.current.addLayer({
                  id: "classifications-layer",
                  type: "fill",
                  source: "classifications",
                  paint: {
                    "fill-color": [
                      "match",
                      ["get", "class"],
                      "forest", "#228B22",
                      "water", "#4169E1",
                      "urban", "#808080",
                      "agriculture", "#FFD700",
                      "#FF0000"
                    ],
                    "fill-opacity": 0.6,
                    "fill-outline-color": "#000000",
                  },
                });

                const popup = new maplibregl.Popup({
                  closeButton: false,
                  closeOnClick: false,
                });

                map.current.on("mouseenter", "classifications-layer", () => {
                  map.current!.getCanvas().style.cursor = "pointer";
                });

                map.current.on("mouseleave", "classifications-layer", () => {
                  map.current!.getCanvas().style.cursor = "";
                  popup.remove();
                });

                map.current.on("mousemove", "classifications-layer", e => {
                  if (e.features && e.features.length > 0) {
                    const feature = e.features[0];
                    const properties = feature.properties;
                    const content = Object.entries(properties)
                      .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                      .join("<br/>");

                    popup
                      .setLngLat(e.lngLat)
                      .setHTML(content)
                      .addTo(map.current!);
                  }
                });
              } catch (error) {
                console.error("Error adding layer to map:", error);
                setClassificationResult(`Error displaying results: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
            setClassifying(false);
            setDetecting(false);
            setClassificationResult("Land cover classification complete!");
          }
          break;
        case "error":
          console.error("Worker error:", payload);
          setClassifying(false);
          setInitializing(false);
          setDetecting(false);
          setClassificationResult(`Error: ${payload}`);
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleClassify = async () => {
    if (!polygon || !workerRef.current) return;
    
    setClassifying(true);
    setInitializing(true);
    setClassificationResult(null);
    setDetecting(true);

    try {
      workerRef.current.postMessage({
        type: "init",
        payload: {
          task: "land-cover-classification",
          ...(mapProvider === "geobase" ? GEOBASE_CONFIG : MAPBOX_CONFIG),
          modelId: customModelId || selectedModel,
        },
      });

      await new Promise<void>((resolve, reject) => {
        const messageHandler = (e: MessageEvent) => {
          const { type, payload } = e.data;
          if (type === "init_complete") {
            workerRef.current?.removeEventListener("message", messageHandler);
            resolve();
          } else if (type === "error") {
            workerRef.current?.removeEventListener("message", messageHandler);
            reject(new Error(payload));
          } else if (type === "inference_complete"){
            workerRef.current?.removeEventListener("message", messageHandler);
            const detections = payload.detections;
          if (detections) {
            setClassifications(detections);
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
                data: detections,
              });

              // Add a layer to display the detections
              map.current.addLayer({
                id: "detections-layer",
                type: "fill",
                source: "detections",
                paint: {
                  "fill-color": "#0000ff",
                  "fill-opacity": 0.4,
                  "fill-outline-color": "#0000ff",
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
          }
        };
        workerRef.current?.addEventListener("message", messageHandler);
      });

      // Now run inference
      workerRef.current.postMessage({
        type: "inference",
        payload: {
          polygon,
          confidenceScore,
          zoomLevel,
        },
      });
    } catch (error) {
      console.error("Classification error:", error);
      setDetecting(false);
      setInitializing(false);
      setClassificationResult(error instanceof Error ? error.message : "Error during classification. Please try again.");
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
            <h2 className="text-2xl font-bold text-gray-800">Object Detection</h2>
            <p className="text-sm text-gray-600">
              Draw a polygon on the map and run object detection within the
              selected area.
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
                disabled={!polygon || classifying || initializing}
                onClick={handleClassify}
              >
                {classifying || initializing ? (
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
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
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
            </div>

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
              </div>
            </div>
          </div>

          {classificationResult && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg">
              {classificationResult}
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

