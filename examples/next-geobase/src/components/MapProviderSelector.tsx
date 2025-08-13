import React from 'react';
import { MapProvider } from "../types"

interface MapProviderSelectorProps {
  value: MapProvider;
  onChange: (provider: MapProvider) => void;
  className?: string;
}

export const MapProviderSelector: React.FC<MapProviderSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  return (
    <div className={className}>
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
        <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
        Map Provider
      </h3>
      <div className="relative">
        <select
          id="mapProvider"
          value={value}
          onChange={(e) => onChange(e.target.value as MapProvider)}
          className="block w-full rounded-lg bg-white/50 backdrop-blur-sm border border-gray-300/60 text-gray-800 placeholder-gray-500 focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-300 p-3 pl-10 appearance-none"
        >
          <option value="geobase" className="bg-white">Geobase</option>
          <option value="mapbox" className="bg-white">Mapbox</option>
          <option value="esri" className="bg-white">ESRI</option>
        </select>
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {value === "geobase" ? (
            <img src="/geoai-live/favicon-16x16.png" alt="Geobase" className="w-4 h-4" />
          ) : value === "esri" ? (
            <span className="text-gray-500">🌍</span>
          ) : (
            <span className="text-gray-500">🗺️</span>
          )}
        </div>
      </div>
    </div>
  );
};
