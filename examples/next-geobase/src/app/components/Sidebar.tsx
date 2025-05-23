import React, { useRef, useState, MutableRefObject } from "react";
import { callPipeline, initializePipeline } from "@/lib/pipeline";
import AnalysisPanel from "./AnalysisPanel";
import MapSourcesPanel from "./MapSourcesPanel";
import { GeoJSONFeature, AnalysisResult } from "./types";
import maplibregl from 'maplibre-gl';


const GEOBASE_CONFIG = {
  projectRef: "wmrosdnjsecywfkvxtrw",
  apikey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4OTY1NDU4MjUsImlhdCI6MTczODc2MTQyNSwiaXNzIjoic3VwYWJhc2UiLCJyb2xlIjoiYW5vbiJ9.M8jeru5dbHe4tGh52xe2E2HlUiGCAPbZ8-JrfbxiRk0",
  cogImagery:
    "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/67ba1d2bec9237a9ebd358a3/0/67ba1d2bec9237a9ebd358a4.tif",
  provider: "geobase",
};

type SidebarProps = {
    map: MutableRefObject<maplibregl.Map | null>;
    taskType?: string;
};

const Sidebar: React.FC<SidebarProps> = ({ map, taskType }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activePanel, setActivePanel] = useState<"analysis" | "map-sources">("analysis");
    const [activeResultTab, setActiveResultTab] = useState<"image" | "geojson" | "stats">("image");
    const [drawnFeatures, setDrawnFeatures] = useState<GeoJSONFeature[]>([]);
    const [selectedFeature, setSelectedFeature] = useState<GeoJSONFeature | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleMapSourceChange = (sourceId: string) => {
    if (!map.current) return;

    // Remove existing layers
    if (map.current.getLayer("osm-tiles")) {
      map.current.removeLayer("osm-tiles");
    }
    if (map.current.getLayer("simple-tiles")) {
      map.current.removeLayer("simple-tiles");
    }
    if (map.current.getLayer("mapbox-satellite")) {
      map.current.removeLayer("mapbox-satellite");
    }

    // Add new layer based on selection
    switch (sourceId) {
      case "osm":
        map.current.addLayer({
          id: "osm-tiles",
          type: "raster",
          source: "osm",
          minzoom: 0,
          maxzoom: 19,
        });
        break;
      case "geobase":
        // Always add OSM as base layer first
        map.current.addLayer({
          id: "osm-tiles",
          type: "raster",
          source: "osm",
          minzoom: 0,
          maxzoom: 19,
        });
        // Then add GeoBase layer on top
        map.current.addLayer({
          id: "simple-tiles",
          type: "raster",
          source: "raster-tiles",
          minzoom: 0,
          maxzoom: 22,
        });
        break;
      case "mapbox":
        map.current.addLayer({
          id: "mapbox-satellite",
          type: "raster",
          source: "mapbox-satellite",
          minzoom: 0,
          maxzoom: 22,
        });
        break;
    }
  };

  const handleGeoJSONImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const geojsonData = JSON.parse(e.target?.result as string);

        // Handle both Feature and FeatureCollection
        let features: GeoJSON.Feature[] = [];
        if (geojsonData.type === "Feature") {
          features = [geojsonData];
        } else if (geojsonData.type === "FeatureCollection") {
          features = geojsonData.features;
        }

        // Add IDs to features if they don't have them and ensure geometry matches local type
        const processedFeatures: GeoJSONFeature[] = features
          .filter((feature) => feature.geometry.type !== "GeometryCollection")
          .map((feature) => ({
            id: feature.id || `feature-${Date.now()}-${Math.random()}`,
            type: feature.type,
            geometry: {
              type: feature.geometry.type,
              coordinates: feature.geometry.coordinates,
            },
            properties: {
              ...feature.properties,
              id: feature.id || `feature-${Date.now()}-${Math.random()}`,
              name:
                feature.properties?.name ||
                `Imported Feature ${drawnFeatures.length + 1}`,
              type: feature.properties?.type || feature.geometry.type,
            },
          }));

        setDrawnFeatures([...drawnFeatures, ...processedFeatures]);
      } catch (error) {
        console.error("Error parsing GeoJSON:", error);
        alert("Invalid GeoJSON file");
      }
    };
    reader.readAsText(file);
  };

  
  const handleAnalysisTask = async (task: string) => {
    console.log("Starting analysis task:", task);
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      // First initialize the pipeline
      const instanceId = await initializePipeline(task, {
        projectRef: GEOBASE_CONFIG.projectRef,
        apikey: GEOBASE_CONFIG.apikey,
        cogImagery: GEOBASE_CONFIG.cogImagery,
        provider: GEOBASE_CONFIG.provider,
      });

      // Then call the pipeline with the instance ID
      const result = await callPipeline(
        instanceId,
        task,
        {
          projectRef: GEOBASE_CONFIG.projectRef,
          apikey: GEOBASE_CONFIG.apikey,
          cogImagery: GEOBASE_CONFIG.cogImagery,
          provider: GEOBASE_CONFIG.provider,
        },
        {
          features: drawnFeatures,
          map: map.current,
        }
      );

      console.log("Analysis result:", result);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Error performing analysis:", error);
      alert("An error occurred while performing analysis");
    } finally {
      setIsLoading(false);
    }
  };

    return (
        <div className="w-[400px] h-full bg-white border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-[rgb(36,124,83)]">
                        Geobase-AI
                    </span>
                    <div className="flex space-x-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".geojson,.json"
                            onChange={handleGeoJSONImport}
                        />
                        <button
                            className="text-[rgb(36,124,83)] hover:text-[rgb(36,124,83)] hover:bg-opacity-10 text-sm px-3 py-1 rounded"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <i className="fas fa-upload mr-1"></i> Import GeoJSON
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    className={`flex-1 p-3 text-center ${
                        activePanel === "analysis"
                            ? "text-[rgb(36,124,83)] border-b-2 border-[rgb(36,124,83)]"
                            : "text-gray-600"
                    }`}
                    onClick={() => setActivePanel("analysis")}
                >
                    <i className="fas fa-chart-bar mr-1"></i> Analysis
                </button>
                <button
                    className={`flex-1 p-3 text-center ${
                        activePanel === "map-sources"
                            ? "text-[rgb(36,124,83)] border-b-2 border-[rgb(36,124,83)]"
                            : "text-gray-600"
                    }`}
                    onClick={() => setActivePanel("map-sources")}
                >
                    <i className="fas fa-map mr-1"></i> Map Sources
                </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activePanel === "analysis" ? (
                    <AnalysisPanel
                        selectedFeature={selectedFeature}
                        drawnFeatures={drawnFeatures}
                        setSelectedFeature={setSelectedFeature}
                        handleAnalysisTask={handleAnalysisTask}
                        activeResultTab={activeResultTab}
                        setActiveResultTab={setActiveResultTab}
                        analysisResult={analysisResult}
                        isLoading={isLoading}
                    />
                ) : (
                    <MapSourcesPanel handleMapSourceChange={handleMapSourceChange} />
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 text-sm text-[rgba(32,32,32,0.8)]">
                <div className="flex justify-between items-center">
                    <span>Status: Ready</span>
                    <span>0.0000, 0.0000</span>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;