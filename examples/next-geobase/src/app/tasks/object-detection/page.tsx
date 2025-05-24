"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MaplibreDraw from "maplibre-gl-draw";
import { geobaseAi } from "geobase-ai";
// const geobaseAi = require("geobase-ai/dist/geobase-ai.cjs.js");

const GEOBASE_CONFIG = {
  projectRef: "wmrosdnjsecywfkvxtrw",
  apikey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4OTY1NDU4MjUsImlhdCI6MTczODc2MTQyNSwiaXNzIjoic3VwYWJhc2UiLCJyb2xlIjoiYW5vbiJ9.M8jeru5dbHe4tGh52xe2E2HlUiGCAPbZ8-JrfbxiRk0",
  cogImagery:
    "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/67ba1d2bec9237a9ebd358a3/0/67ba1d2bec9237a9ebd358a4.tif",
};

export default function ObjectDetection() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MaplibreDraw | null>(null);
  const [polygon, setPolygon] = useState<GeoJSON.Feature | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<string | null>(null);
  const [objectDetector, setObjectDetector] = useState<unknown>(null);
  const [detections, setDetections] = useState<GeoJSON.FeatureCollection>();
  const [zoomLevel, setZoomLevel] = useState<number>(22);
  const [confidenceScore, setConfidenceScore] = useState<number>(0.9);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
          },
          "raster-tiles": {
            type: "raster",
            tiles: [
              `https://${GEOBASE_CONFIG.projectRef}.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${GEOBASE_CONFIG.cogImagery}&apikey=${GEOBASE_CONFIG.apikey}`,
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
          {
            id: "simple-tiles",
            type: "raster",
            source: "raster-tiles",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: [114.84857638295142, -3.449805712621256],
      zoom: 18,
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
  }, []);

  const handleDetect = async () => {
    if (!polygon) return;
    setDetecting(true);
    setDetectionResult(null);

    let _objectDetector = objectDetector;
    try {
      // Initialize object detection pipeline
      if (!_objectDetector) {
        const geobaseParams = {
          provider: "geobase",
          projectRef: GEOBASE_CONFIG.projectRef,
          apikey: GEOBASE_CONFIG.apikey,
          cogImagery: GEOBASE_CONFIG.cogImagery,
        };

        // Use the imported geobaseAi
        const response = await geobaseAi.pipeline(
          "object-detection",
          geobaseParams
        );
        _objectDetector = response.instance;
      }

      // Process detection request
      if (_objectDetector && typeof _objectDetector.inference === "function") {
        const result = await _objectDetector.inference(
          polygon,
          confidenceScore,
          {
            zoomLevel: zoomLevel,
          }
        );
        console.log({ result });
        if (result.detections) {
          setDetections(result.detections);
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
              data: result.detections,
            });

            // Add a layer to display the detections
            map.current.addLayer({
              id: "detections-layer",
              type: "fill",
              source: "detections",
              paint: {
                "fill-color": "#ff0000",
                "fill-opacity": 0.4,
                "fill-outline-color": "#990000",
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

                popup.setLngLat(e.lngLat).setHTML(content).addTo(map.current!);
              }
            });
          }
        }
        setDetecting(false);
        setDetectionResult("Object detection complete!");
        setObjectDetector(_objectDetector);
      } else {
        throw new Error("Object detector not properly initialized");
      }
    } catch (error) {
      console.error("Detection error:", error);
      setDetecting(false);
      setDetectionResult("Error during detection. Please try again.");
    }
  };

  const handleStartDrawing = () => {
    if (draw.current) {
      draw.current.changeMode("draw_polygon");
    }
  };

  return (
    <main className="w-full h-screen flex">
      {/* Sidebar */}
      <aside className="w-80 bg-gray-100 border-r h-full p-6 flex flex-col gap-4 text-black">
        <h2 className="text-lg font-bold mb-2 text-black">Object Detection</h2>

        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={handleStartDrawing}
        >
          Draw Polygon
        </button>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={!polygon || detecting}
          onClick={handleDetect}
        >
          {detecting ? "Detecting..." : "Run Detection"}
        </button>
        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="zoomLevel"
              className="block text-sm font-medium text-black"
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
                setZoomLevel(Math.min(22, Math.max(0, Number(e.target.value))))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-black"
            />
          </div>

          <div>
            <label
              htmlFor="confidenceScore"
              className="block text-sm font-medium text-black"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-black"
            />
          </div>
        </div>
        {detectionResult && (
          <div className="mt-4 p-2 bg-green-100 text-black rounded">
            {detectionResult}
          </div>
        )}
        {!polygon && (
          <div className="mt-4 text-sm text-black">
            Draw a polygon to enable detection.
          </div>
        )}
      </aside>
      {/* Map */}
      <div className="flex-1 h-full relative">
        <div ref={mapContainer} className="w-full h-full" />
      </div>
    </main>
  );
}
