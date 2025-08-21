import React from 'react';
import { MapProviderSelector } from '../../../components';
import { MapProvider } from '../../../types';

interface MapProviderSelectorWrapperProps {
  value: MapProvider;
  onChange: (provider: MapProvider) => void;
}

export const MapProviderSelectorWrapper: React.FC<MapProviderSelectorWrapperProps> = ({
  value,
  onChange,
}) => {
  return (
    <div 
      className="absolute top-6 left-32 z-50 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-md shadow-md p-2"
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseOver={(e) => e.stopPropagation()}
    >
      <MapProviderSelector
        value={value}
        onChange={onChange}
        className=""
      />
    </div>
  );
};
