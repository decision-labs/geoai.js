import React from "react";

type MapSourcesPanelProps = {
    handleMapSourceChange: (sourceId: string) => void;
};

const MapSourcesPanel: React.FC<MapSourcesPanelProps> = ({
    handleMapSourceChange,
}) => {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="font-semibold text-[rgb(36,124,83)] mb-2 text-sm">
                    Base Maps
                </h3>
                <div className="space-y-2">
                    <button
                        className="w-full p-3 text-left border border-gray-200 rounded-md hover:bg-[rgb(36,124,83)] hover:bg-opacity-10"
                        onClick={() => handleMapSourceChange("geobase")}
                    >
                        <div className="font-medium">GeoBase</div>
                        <div className="text-sm text-gray-500">
                            High-resolution satellite imagery
                        </div>
                    </button>
                    <button
                        className="w-full p-3 text-left border border-gray-200 rounded-md hover:bg-[rgb(36,124,83)] hover:bg-opacity-10"
                        onClick={() => handleMapSourceChange("mapbox")}
                    >
                        <div className="font-medium">Mapbox Satellite</div>
                        <div className="text-sm text-gray-500">
                            High-resolution satellite imagery from Mapbox
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MapSourcesPanel;
