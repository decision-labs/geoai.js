import React, { useState } from 'react';
import { GlassmorphismCard } from './ui/GlassmorphismCard';
import { GradientButton } from './ui/GradientButton';
import { ZoomSlider } from './ui/ZoomSlider';
import { MapProviderSelector } from './MapProviderSelector';
import { StatusMessage } from './ui/StatusMessage';
import { ConfidenceSlider } from './ui/ConfidenceSlider';
import { ClassLabelSelector } from './ui/ClassLabelSelector';
import { PostProcessingControls } from './ui/PostProcessingControls';
import { MapProvider } from "../types"

interface ZeroShotSegmentationControlsProps {
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
  postMinThreshold: number;
  postMaxThreshold: number;
  detections?: GeoJSON.FeatureCollection;

  // Action props
  onStartDrawing: () => void;
  onDetect: () => void;
  onReset: () => void;
  onZoomChange: (zoom: number) => void;
  onMapProviderChange: (provider: MapProvider) => void;
  onClassLabelChange: (label: string) => void;
  onConfidenceScoreChange: (score: number) => void;
  onPostMinThresholdChange: (threshold: number) => void;
  onPostMaxThresholdChange: (threshold: number) => void;
  onClearError: () => void;

  className?: string;
}

export const ZeroShotSegmentationControls: React.FC<ZeroShotSegmentationControlsProps> = ({
  polygon,
  isInitialized,
  isProcessing,
  zoomLevel,
  mapProvider,
  lastResult,
  error,
  classLabel,
  confidenceScore,
  postMinThreshold,
  postMaxThreshold,
  detections,
  onStartDrawing,
  onDetect,
  onReset,
  onZoomChange,
  onMapProviderChange,
  onClassLabelChange,
  onConfidenceScoreChange,
  onPostMinThresholdChange,
  onPostMaxThresholdChange,
  onClearError,
  className = ""
}) => {
  return (
    <div className={`h-full flex flex-col ${className}`}>
      <GlassmorphismCard className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6 text-black">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Zero Shot Object Segmentation
            </h2>
            <p className="text-sm text-gray-600">
              Draw a polygon on the map and run zero shot object segmentation within the
              selected area.
            </p>
          </div>

          {/* Status Messages */}
          {!polygon && (
            <StatusMessage 
              type="info" 
              message="Draw a polygon on the map to enable segmentation."
            />
          )}

          {error && (
            <StatusMessage 
              type="error" 
              message={error}
            />
          )}

          {/* Map Provider Selection */}
          <GlassmorphismCard className="p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Map Provider</h3>
            <MapProviderSelector
              value={mapProvider}
              onChange={onMapProviderChange}
            />
          </GlassmorphismCard>

          {/* Drawing Controls */}
          <div className="space-y-3">
            <GradientButton
              variant="primary"
              onClick={onStartDrawing}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
              }
              className="w-full"
            >
              Draw Area of Interest
            </GradientButton>

            {/* Class Label Selection */}
            <ClassLabelSelector
              value={classLabel}
              onChange={onClassLabelChange}
              className="mt-3"
            />

            <GradientButton
              variant="primary"
              onClick={onDetect}
              disabled={!polygon || isProcessing || !isInitialized}
              loading={isProcessing}
              icon={
                !isProcessing ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : undefined
              }
              className="w-full"
            >
              {isProcessing 
                ? (!isInitialized ? "Initializing Model..." : "Running Segmentation...") 
                : "Run Segmentation"
              }
            </GradientButton>

            <GradientButton
              variant="danger"
              onClick={onReset}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
              }
              className="w-full"
            >
              Reset
            </GradientButton>
          </div>

          {/* Detection Settings */}
          <GlassmorphismCard className="p-4">
            <h3 className="font-semibold text-gray-800 mb-4">Detection Settings</h3>
            <div className="space-y-4">
              <ZoomSlider
                value={zoomLevel}
                onChange={onZoomChange}
                min={0}
                max={22}
              />

              <ConfidenceSlider
                value={confidenceScore}
                onChange={onConfidenceScoreChange}
              />
            </div>
          </GlassmorphismCard>

          {/* Post-processing Controls */}
          {detections && (
            <PostProcessingControls
              minThreshold={postMinThreshold}
              maxThreshold={postMaxThreshold}
              onMinThresholdChange={onPostMinThresholdChange}
              onMaxThresholdChange={onPostMaxThresholdChange}
            />
          )}

          {/* Results */}
          {lastResult && (
            <StatusMessage 
              type="success" 
              message="Zero Shot Object Segmentation complete!"
            />
          )}
        </div>
      </GlassmorphismCard>
    </div>
  );
};
