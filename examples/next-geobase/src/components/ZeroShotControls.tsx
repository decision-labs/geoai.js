import React, { useState } from 'react';
import { GlassmorphismCard } from './ui/GlassmorphismCard';
import { GradientButton } from './ui/GradientButton';
import { ZoomSlider } from './ui/ZoomSlider';
import { MapProviderSelector } from './MapProviderSelector';
import { StatusMessage } from './ui/StatusMessage';
import { MapProvider } from "../types"


interface ZeroShotControlsProps {
  // State props
  polygon: GeoJSON.Feature | null;
  isInitialized: boolean;
  isProcessing: boolean;
  zoomLevel: number;
  mapProvider: MapProvider;
  lastResult: any;
  error: string | null;
  classLabel: string;
  confidenceScore: number;

  // Action props
  onStartDrawing: () => void;
  onDetect: () => void;
  onReset: () => void;
  onZoomChange: (zoom: number) => void;
  onMapProviderChange: (provider: MapProvider) => void;
  onClassLabelChange: (label: string) => void;
  onConfidenceScoreChange: (score: number) => void;
  onClearError: () => void;

  taskName?: string;
  className?: string;
}

export const ZeroShotControls: React.FC<ZeroShotControlsProps> = ({
  taskName = "Zero Shot Object Detection",
  polygon,
  isInitialized,
  isProcessing,
  zoomLevel,
  mapProvider,
  lastResult,
  error,
  classLabel,
  confidenceScore,
  onStartDrawing,
  onDetect,
  onReset,
  onZoomChange,
  onMapProviderChange,
  onClassLabelChange,
  onConfidenceScoreChange,
  onClearError,
  className = '',
}) => {
  // Add state for custom class label
  const [isCustomClass, setIsCustomClass] = useState(false);
  
  // Predefined class labels
  const predefinedLabels = [
    "cars.",
    "trees.",
    "buildings.",
    "trucks.", 
    "cooling towers.",
    "ships.",
    "boats.",
    "solar panels.",
    "swimming pools.",
  ];

  // Helper to ensure label ends with a dot
  const ensureDot = (label: string) => {
    const trimmed = label.trim();
    return trimmed && !trimmed.endsWith('.') ? trimmed + '.' : trimmed;
  };

  const handleClassLabelSelectChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomClass(true);
      onClassLabelChange('');
    } else {
      setIsCustomClass(false);
      onClassLabelChange(value);
    }
  };

  const handleCustomInputChange = (value: string) => {
    onClassLabelChange(value);
  };

  const handleCustomInputBlur = (value: string) => {
    onClassLabelChange(ensureDot(value));
  };
  // Icons
  const PlusIcon = (
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

  const PlayIcon = (
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

  const ResetIcon = (
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

  return (
    <div className={`p-6 flex flex-col gap-6 text-gray-800 overflow-y-auto h-full ${className}`}>
      {/* Title section with glow effect */}
      <div className="space-y-3 relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg blur opacity-10"></div>
        <div className="relative backdrop-blur-sm bg-white/90 p-4 rounded-lg border border-green-200/50 shadow-sm">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
            {taskName}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Advanced geospatial AI powered detection system
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
          <GradientButton
            variant="primary"
            onClick={onStartDrawing}
            icon={PlusIcon}
          >
            Draw Area of Interest
          </GradientButton>

          {/* Class Label Selection */}
          <GlassmorphismCard glowColor="teal">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Label
              </label>
              
              <div className="space-y-3">
                <select
                  value={isCustomClass ? 'custom' : classLabel}
                  onChange={(e) => handleClassLabelSelectChange(e.target.value)}
                  className="block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none sm:text-sm text-gray-900 px-3 py-2 transition-all border"
                >
                  {predefinedLabels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                  <option value="custom">Custom...</option>
                </select>

                {isCustomClass && (
                  <input
                    type="text"
                    value={classLabel}
                    onChange={(e) => handleCustomInputChange(e.target.value)}
                    onBlur={(e) => handleCustomInputBlur(e.target.value)}
                    placeholder="e.g., car."
                    className="block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none sm:text-sm text-gray-900 px-3 py-2 transition-all border"
                  />
                )}
              </div>
              
              <p className="text-xs text-gray-600 mt-2">
                Specify the object type you want to detect (e.g., "cars.", "buildings.")
              </p>
            </div>
          </GlassmorphismCard>

          <GradientButton
            variant="secondary"
            onClick={onDetect}
            disabled={!polygon || !isInitialized || isProcessing || !classLabel.trim()}
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
          <div className="space-y-4">
            <ZoomSlider
              value={zoomLevel}
              onChange={onZoomChange}
              max={23}
            />
            
            {/* Confidence Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Confidence Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={confidenceScore}
                  onChange={(e) => onConfidenceScoreChange(Math.min(1, Math.max(0, Number(e.target.value))))}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={confidenceScore}
                  onChange={(e) => onConfidenceScoreChange(Math.min(1, Math.max(0, Number(e.target.value))))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>1</span>
                </div>
              </div>
              
              <p className="text-xs text-gray-600">
                Minimum confidence threshold for object detection
              </p>
            </div>
          </div>
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
