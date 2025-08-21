"use client";
import React, { useState } from 'react';
import { GlassmorphismCard } from './ui/GlassmorphismCard';
import { GradientButton } from './ui/GradientButton';
import { ZoomSlider } from './ui/ZoomSlider';
import { MapProviderSelector } from './MapProviderSelector';
import { StatusMessage } from './ui/StatusMessage';
import { MapProvider } from "../types"

interface DetectionControlsProps {
  // State props
  polygon: GeoJSON.Feature | null;
  isInitialized: boolean;
  isProcessing: boolean;
  zoomLevel: number;
  mapProvider: MapProvider;
  lastResult: any;
  error: string | null;
  drawWarning?: string | null;

  // Content props
  title?: string;
  description?: string;

  // Action props
  onStartDrawing: () => void;
  onDetect: () => void;
  onReset: () => void;
  onZoomChange: (zoom: number) => void;
  onMapProviderChange: (provider: MapProvider) => void;

  className?: string;
  optimumZoom?: number;
}
export const PlusIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500 text-green-600"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
      clipRule="evenodd"
    />
  </svg>
);

export const PlayIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 group-hover:scale-110 transition-transform duration-300 text-emerald-600"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
      clipRule="evenodd"
    />
  </svg>
);

export const ResetIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500 text-red-600"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
      clipRule="evenodd"
    />
  </svg>
);

export const ClearPoint = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm-2.293-5.293a1 1 0 001.414 0L10 11.414l1.879 1.879a1 1 0 001.414-1.414L11.414 10l1.879-1.879a1 1 0 10-1.414-1.414L10 8.586 8.121 6.707a1 1 0 00-1.414 1.414L8.586 10l-1.879 1.879a1 1 0 000 1.414z"
      clipRule="evenodd"
    />
  </svg>
);

export const DetectionControls: React.FC<DetectionControlsProps> = ({
  polygon,
  isInitialized,
  isProcessing,
  zoomLevel,
  mapProvider,
  lastResult,
  error,
  drawWarning = null,
  title = 'AI Detection',
  description = 'Advanced geospatial AI powered detection system',
  onStartDrawing,
  onDetect,
  onReset,
  onZoomChange,
  onMapProviderChange,
  className = '',
  optimumZoom = 18
}) => {
  // Icons
  const [hoverWarning, setHoverWarning] = useState<string | null>(null);
  const showHoverWarning = zoomLevel < optimumZoom - 1;
   

   return (
     <div className={`p-6 flex flex-col gap-6 text-gray-800 overflow-y-auto h-full ${className}`}>
      {/* Title section with glow effect */}
      <div className="space-y-3 relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg blur opacity-10"></div>
        <div className="relative backdrop-blur-sm bg-white/90 p-4 rounded-lg border border-green-200/50 shadow-sm">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
            {title}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Instruction when no polygon */}
      {!polygon && (
        <GlassmorphismCard glowColor="green" className="group-hover:opacity-20 transition duration-1000">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700 text-sm font-medium">
              Draw a polygon to initialize detection
            </span>
          </div>
        </GlassmorphismCard>
      )}

      {mapProvider === "geobase" && (<GlassmorphismCard glowColor="teal" className="group-hover:opacity-20 transition duration-1000 cursor-pointer" padding='sm' onClick={() => onZoomChange(optimumZoom)}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <div className="flex flex-col">
            <span className="text-green-700 text-sm font-medium">
              Optimum zoom level: {optimumZoom}
            </span>
            <span className="text-xs text-gray-500">Tap to jump to optimal zoom</span>
          </div>
        </div>
      </GlassmorphismCard>)}

      <div className="space-y-6">
        {/* Map Provider Selection */}
        <GlassmorphismCard glowColor="emerald">
          <MapProviderSelector
            value={mapProvider}
            onChange={onMapProviderChange}
          />
        </GlassmorphismCard>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <div
            className="relative w-full"
            onMouseEnter={() => { if (showHoverWarning) setHoverWarning(`Zoom in to at least ${optimumZoom -1} to draw a reliable detection zone.`); }}
            onMouseLeave={() => setHoverWarning(null)}
          >
            {/* Compact tooltip rendered above the button so the button design remains unchanged */}
            {hoverWarning && (
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-50">
                {hoverWarning}
              </div>
            )}

            <GradientButton
              variant="primary"
              onClick={onStartDrawing}
              icon={PlusIcon}
              disabled={!!drawWarning}
              className="w-full"
            >
              Draw Detection Zone
            </GradientButton>
           </div>

          <GradientButton
            variant="secondary"
            onClick={onDetect}
            disabled={!polygon || !isInitialized || isProcessing}
            loading={!isInitialized || isProcessing}
            icon={!isInitialized || isProcessing ? undefined : PlayIcon}
          >
            {!isInitialized ? "Initializing AI..." : isProcessing ? "Analyzing..." : "Launch Detection"}
          </GradientButton>

          <GradientButton
            variant="danger"
            onClick={onReset}
            icon={ResetIcon}
          >
            Reset System
          </GradientButton>
        </div>

        {/* Detection Settings */}
        <GlassmorphismCard glowColor="teal">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
            <span className="w-2 h-2 bg-teal-500 rounded-full mr-2 animate-pulse"></span>
            Detection Parameters
          </h3>
          <ZoomSlider
            value={zoomLevel}
            onChange={onZoomChange}
            max={23}
          />
        </GlassmorphismCard>
      </div>

      {/* Status Messages */}
      {lastResult && (
        <StatusMessage
          type="success"
          message="Detection Complete!"
        />
      )}

      {error && (
        <StatusMessage
          type="error"
          message={error}
        />
      )}
    </div>
  );
 };
