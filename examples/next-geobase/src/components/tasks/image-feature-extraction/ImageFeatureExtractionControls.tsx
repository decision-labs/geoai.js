import React from 'react';
import { MapProvider } from '../../../types';

interface ImageFeatureExtractionControlsProps {
  polygon: GeoJSON.Feature | null;
  isInitialized: boolean;
  isProcessing: boolean;
  mapProvider: MapProvider;
  lastResult: any;
  error: string | null;
  onMapProviderChange: (provider: MapProvider) => void;
}

export const ImageFeatureExtractionControls: React.FC<ImageFeatureExtractionControlsProps> = ({
  polygon,
  isInitialized,
  isProcessing,
  mapProvider,
  lastResult,
  error,
  onMapProviderChange,
}) => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Image Feature Extraction
      </h1>
      <p className="text-gray-600 mb-6">
        Extract dense feature representations from satellite imagery using DINOv3
      </p>

      {/* Controls */}
      <div className="space-y-4">
        {/* Results */}
        {lastResult?.features && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Feature Extraction Results
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>Number of features: {lastResult.features.length}</div>
              {lastResult.metadata && (
                <>
                  <div>Feature dimensions: {lastResult.metadata.featureDimensions}</div>
                  <div>Patch size: {lastResult.patchSize}x{lastResult.patchSize}</div>
                  <div>Model: {lastResult.metadata.modelId}</div>
                </>
              )}
              {lastResult.similarityMatrix && (
                <div>Similarity matrix: {lastResult.similarityMatrix.length}x{lastResult.similarityMatrix[0]?.length || 0}</div>
              )}
            </div>
            
            {/* Feature Statistics */}
            {lastResult.features.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Feature Statistics</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>Min similarity: {(() => {
                    let min = Infinity;
                    for (const row of lastResult.similarityMatrix) {
                      for (const val of row) {
                        if (val < min) min = val;
                      }
                    }
                    return min.toFixed(3);
                  })()}</div>
                  <div>Max similarity: {(() => {
                    let max = -Infinity;
                    for (const row of lastResult.similarityMatrix) {
                      for (const val of row) {
                        if (val > max) max = val;
                      }
                    }
                    return max.toFixed(3);
                  })()}</div>
                  <div>Avg similarity: {(() => {
                    let sum = 0;
                    let count = 0;
                    for (const row of lastResult.similarityMatrix) {
                      for (const val of row) {
                        sum += val;
                        count++;
                      }
                    }
                    return (sum / count).toFixed(3);
                  })()}</div>
                  <div>Std dev: {(() => {
                    // Calculate mean first
                    let sum = 0;
                    let count = 0;
                    for (const row of lastResult.similarityMatrix) {
                      for (const val of row) {
                        sum += val;
                        count++;
                      }
                    }
                    const mean = sum / count;
                    
                    // Calculate variance
                    let varianceSum = 0;
                    for (const row of lastResult.similarityMatrix) {
                      for (const val of row) {
                        varianceSum += Math.pow(val - mean, 2);
                      }
                    }
                    const variance = varianceSum / count;
                    return Math.sqrt(variance).toFixed(3);
                  })()}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
