import React from "react";
import Image from "next/image";
import { AnalysisResult, GeoJSONFeature } from "./types";

type AnalysisPanelProps = {
    selectedFeature: GeoJSONFeature | null;
    drawnFeatures: GeoJSONFeature[];
    setSelectedFeature: (feature: GeoJSONFeature) => void;
    handleAnalysisTask: (task: string) => void;
    activeResultTab: string;
    setActiveResultTab: (tab: "image" | "geojson" | "stats") => void;
    analysisResult: AnalysisResult | null;
    isLoading: boolean;
};

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
    selectedFeature,
    drawnFeatures,
    setSelectedFeature,
    handleAnalysisTask,
    activeResultTab,
    setActiveResultTab,
    analysisResult,
    isLoading,
}) => {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="font-semibold text-[rgb(36,124,83)] mb-2 text-sm">
                    Current Selection
                </h3>
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                    <p className="text-gray-600">
                        {selectedFeature
                            ? `Selected: ${selectedFeature.properties?.name || "Feature"}`
                            : "No area selected. Import a GeoJSON file first."}
                    </p>
                </div>
            </div>

            {/* Features Section */}
            <div>
                <h3 className="font-semibold text-[rgb(36,124,83)] mb-2 text-sm">
                    Features
                </h3>
                <div className="border border-gray-200 rounded-md">
                    {drawnFeatures.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                            No features added yet
                        </div>
                    ) : (
                        <ul>
                            {drawnFeatures.map((feature, idx) => (
                                <li
                                    key={feature.properties?.id || idx}
                                    className={`cursor-pointer px-3 py-2 hover:bg-gray-100 ${
                                        selectedFeature === feature ? "bg-green-100" : ""
                                    }`}
                                    onClick={() => setSelectedFeature(feature)}
                                >
                                    {feature.properties?.name || `Feature ${idx + 1}`}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Analysis Tasks Section */}
            <div>
                <h3 className="font-semibold text-[rgb(36,124,83)] mb-2 text-sm">
                    Analysis Tasks
                </h3>
                <div className="space-y-2">
                    <button
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 px-3 py-2 rounded text-sm flex items-center justify-between"
                        onClick={() => handleAnalysisTask("object-detection")}
                        disabled={!selectedFeature || isLoading}
                    >
                        <span>
                            <i className="fas fa-object-group mr-2"></i> Object Detection
                        </span>
                        <i className="fas fa-chevron-right text-xs"></i>
                    </button>

                    <button
                        className="w-full bg-green-50 hover:bg-green-100 text-green-800 px-3 py-2 rounded text-sm flex items-center justify-between"
                        onClick={() => handleAnalysisTask("mask-generation")}
                        disabled={!selectedFeature || isLoading}
                    >
                        <span>
                            <i className="fas fa-mask mr-2"></i> Mask Generation
                        </span>
                        <i className="fas fa-chevron-right text-xs"></i>
                    </button>

                    <button
                        className="w-full bg-purple-50 hover:bg-purple-100 text-purple-800 px-3 py-2 rounded text-sm flex items-center justify-between"
                        onClick={() => handleAnalysisTask("terrain-analysis")}
                        disabled={!selectedFeature || isLoading}
                    >
                        <span>
                            <i className="fas fa-mountain mr-2"></i> Land Cover Classification
                        </span>
                        <i className="fas fa-chevron-right text-xs"></i>
                    </button>

                    <button
                        className="w-full bg-yellow-50 hover:bg-yellow-100 text-yellow-800 px-3 py-2 rounded text-sm flex items-center justify-between"
                        onClick={() => handleAnalysisTask("zero-shot-object-detection")}
                        disabled={!selectedFeature || isLoading}
                    >
                        <span>
                            <i className="fas fa-crosshairs mr-2"></i> Zero Shot Object Detection
                        </span>
                        <i className="fas fa-chevron-right text-xs"></i>
                    </button>

                    <button
                        className="w-full bg-orange-50 hover:bg-orange-100 text-orange-800 px-3 py-2 rounded text-sm flex items-center justify-between"
                        onClick={() => handleAnalysisTask("building-detection")}
                        disabled={!selectedFeature || isLoading}
                    >
                        <span>
                            <i className="fas fa-building mr-2"></i> Building Detection
                        </span>
                        <i className="fas fa-chevron-right text-xs"></i>
                    </button>

                    <button
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 px-3 py-2 rounded text-sm flex items-center justify-between"
                        onClick={() => handleAnalysisTask("car-detection")}
                        disabled={!selectedFeature || isLoading}
                    >
                        <span>
                            <i className="fas fa-car mr-2"></i> Car Detection
                        </span>
                        <i className="fas fa-chevron-right text-xs"></i>
                    </button>

                    <button
                        className="w-full bg-teal-50 hover:bg-teal-100 text-teal-800 px-3 py-2 rounded text-sm flex items-center justify-between"
                        onClick={() => handleAnalysisTask("wetland-detection")}
                        disabled={!selectedFeature || isLoading}
                    >
                        <span>
                            <i className="fas fa-water mr-2"></i> Wet Land Detection
                        </span>
                        <i className="fas fa-chevron-right text-xs"></i>
                    </button>

                    <button
                        className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-900 px-3 py-2 rounded text-sm flex items-center justify-between"
                        onClick={() => handleAnalysisTask("solar-panel-detection")}
                        disabled={!selectedFeature || isLoading}
                    >
                        <span>
                            <i className="fas fa-solar-panel mr-2"></i> Solar Panel Detection
                        </span>
                        <i className="fas fa-chevron-right text-xs"></i>
                    </button>

                    <button
                        className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-800 px-3 py-2 rounded text-sm flex items-center justify-between"
                        onClick={() => handleAnalysisTask("ship-detection")}
                        disabled={!selectedFeature || isLoading}
                    >
                        <span>
                            <i className="fas fa-ship mr-2"></i> Ship Detection
                        </span>
                        <i className="fas fa-chevron-right text-xs"></i>
                    </button>

                    <button
                        className="w-full bg-pink-50 hover:bg-pink-100 text-pink-800 px-3 py-2 rounded text-sm flex items-center justify-between"
                        onClick={() => handleAnalysisTask("oriented-object-detection")}
                        disabled={!selectedFeature || isLoading}
                    >
                        <span>
                            <i className="fas fa-compass mr-2"></i> Oriented Object Detection
                        </span>
                        <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                </div>
            </div>

            {/* Results Section */}
            <div>
                <h3 className="font-semibold text-[rgb(36,124,83)] mb-2 text-sm">
                    Results
                </h3>
                {/* ...existing code for results tabs and content... */}
            </div>
        </div>
    );
};

export default AnalysisPanel;
