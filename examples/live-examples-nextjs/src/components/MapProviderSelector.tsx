import React from 'react';
import { MapProvider } from "../types"

const ALL_PROVIDERS: { value: MapProvider; label: string }[] = [
  { value: "geobase", label: "Geobase" },
  { value: "mapbox", label: "Mapbox" },
  { value: "esri", label: "ESRI" },
  { value: "tms", label: "TMS" },
  { value: "wms", label: "WMS (NRW)" },
  { value: "oam", label: "OAM (HOT)" },
];

interface MapProviderSelectorProps {
  value: MapProvider;
  onChange: (provider: MapProvider) => void;
  className?: string;
  allowedProviders?: MapProvider[];
}

export const MapProviderSelector: React.FC<MapProviderSelectorProps> = ({
  value,
  onChange,
  className = '',
  allowedProviders,
}) => {
  const providers = allowedProviders
    ? ALL_PROVIDERS.filter(provider => allowedProviders.includes(provider.value))
    : ALL_PROVIDERS;

  return (
    <div className={className}>
      <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
        Map Provider
      </h3>
      <div className="relative">
        <select
          id="mapProvider"
          value={value}
          onChange={(e) => onChange(e.target.value as MapProvider)}
          className="block w-full rounded-md bg-white/80 backdrop-blur-sm border border-gray-300/60 text-gray-800 placeholder-gray-500 focus:border-green-400 focus:ring-1 focus:ring-green-400/20 transition-all duration-300 p-2 pl-8 appearance-none text-sm cursor-pointer"
        >
          {providers.map(provider => (
            <option key={provider.value} value={provider.value} className="bg-white">
              {provider.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            {value === "geobase" ? (
            <img src="/geoai-live/favicon-16x16.png" alt="Geobase" className="w-3 h-3" />
          ) : value === "esri" || value === "tms" ? (
            <span className="text-gray-500 text-xs">🌍</span>
          ) : value === "wms" ? (
            <span className="text-gray-500 text-xs">🗺️</span>
          ) : value === "oam" ? (
            <span className="text-gray-500 text-xs">✈️</span>
          ) : (
            <span className="text-gray-500 text-xs">🛰️</span>
          )}
        </div>
      </div>
    </div>
  );
};
