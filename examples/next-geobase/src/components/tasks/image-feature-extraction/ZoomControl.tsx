import React from 'react';
import { InfoTooltip } from '../../../components';

interface ZoomControlProps {
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
}

export const ZoomControl: React.FC<ZoomControlProps> = ({
  zoomLevel,
  onZoomChange,
  minZoom = 15,
  maxZoom = 22,
  className = '',
}) => {
  return (
    <div className={`bg-white/90 text-gray-800 px-3 py-2 rounded-md shadow-md backdrop-blur-sm border border-gray-200 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="flex flex-col items-center space-y-1">
          <button
            onClick={() => onZoomChange(zoomLevel + 1)}
            disabled={zoomLevel >= maxZoom}
            className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded text-gray-600 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button
            onClick={() => onZoomChange(zoomLevel - 1)}
            disabled={zoomLevel <= minZoom}
            className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded text-gray-600 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 font-medium">ZOOM</span>
            <InfoTooltip 
              title="Zoom Parameter"
              position="bottom"
            >
              <p>Zoom level is passed as a parameter to the model for inference. See <code className="font-mono text-blue-300">BaseModel.polygonToImage()</code> method.</p>
            </InfoTooltip>
          </div>
          <span className="text-sm font-semibold text-gray-800">{zoomLevel}</span>
        </div>
      </div>
    </div>
  );
};
