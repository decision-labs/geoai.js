import React from 'react';
import { Pencil, Target, Trash2, Loader2 } from 'lucide-react';
import { ExportButton } from '../../../components';

interface ActionButtonsProps {
  isInitialized: boolean;
  isDrawingMode: boolean;
  polygon: GeoJSON.Feature | null;
  isButtonDisabled: boolean;
  isButtonLoading: boolean;
  isExtractingFeatures: boolean;
  showPrecomputedEmbeddings: boolean;
  isResetting: boolean;
  lastResult: any;
  mapProvider: string;
  allPatches: GeoJSON.Feature<GeoJSON.Polygon>[];
  onStartDrawing: () => void;
  onReset: () => void;
  onResetAndDraw: () => void;
  onResetToDemo: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  isInitialized,
  isDrawingMode,
  polygon,
  isButtonDisabled,
  isButtonLoading,
  isExtractingFeatures,
  showPrecomputedEmbeddings,
  isResetting,
  lastResult,
  mapProvider,
  allPatches,
  onStartDrawing,
  onReset,
  onResetAndDraw,
  onResetToDemo,
}) => {
  if (!isInitialized) {
    return (
      <div className="px-4 py-2 rounded-md shadow-xl backdrop-blur-sm font-medium text-sm flex items-center space-x-2 border bg-blue-600 text-white border-blue-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading Model...</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={isDrawingMode ? onStartDrawing : (polygon ? onResetAndDraw : onStartDrawing)}
        disabled={isButtonDisabled}
        className={`px-4 py-2 rounded-md shadow-xl backdrop-blur-sm font-medium text-sm transition-all duration-200 flex items-center space-x-2 border cursor-pointer ${
          isButtonLoading ? 'bg-gray-400 text-white border-gray-300' : // Resetting state or loading precomputed embeddings
          isExtractingFeatures ? 'bg-gray-400 text-white border-gray-300' : // Extracting features
          isDrawingMode ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500' : // Drawing active
          polygon ? 'bg-rose-600 text-white hover:bg-rose-700 border-rose-500' : // Polygon drawn (Reset)
          'bg-blue-600 text-white hover:bg-blue-700 border-blue-500' // Initial (Start Drawing)
        }`}
      >
        {isResetting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Resetting...</span>
          </>
        ) : isExtractingFeatures ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Extracting Features...</span>
          </>
        ) : isDrawingMode ? (
          <>
            <Target className="w-4 h-4" />
            <span>Drawing Active</span>
          </>
        ) : polygon ? (
          <>
            <Trash2 className="w-4 h-4" />
            <span>Reset & Draw Another</span>
          </>
        ) : (
          <>
            <Pencil className="w-4 h-4" />
            <span>Draw & Extract</span>
          </>
        )}
      </button>

      {/* Reset to Demo Button - Show when features have been extracted */}
      {lastResult?.features && (
        <button
          onClick={onResetToDemo}
          disabled={isButtonDisabled}
          className="px-4 py-2 rounded-md shadow-xl backdrop-blur-sm font-medium text-sm transition-all duration-200 flex items-center space-x-2 border bg-purple-600 text-white hover:bg-purple-700 border-purple-500 cursor-pointer"
          title="Reset current work and return to precomputed embeddings demo"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
          </svg>
          <span>Reset & Load Demo</span>
        </button>
      )}

      {/* Back to Menu Button - Show when precomputed embeddings are visible */}
      {showPrecomputedEmbeddings && !lastResult?.features && (
        <button
          onClick={onReset}
          disabled={isButtonDisabled}
          className="px-4 py-2 rounded-md shadow-xl backdrop-blur-sm font-medium text-sm transition-all duration-200 flex items-center space-x-2 border bg-gray-600 text-white hover:bg-gray-700 border-gray-500 cursor-pointer"
          title="Return to main menu"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Back to Menu</span>
        </button>
      )}

      {/* Export Button */}
      {lastResult?.features && (
        <ExportButton
          detections={lastResult.features}
          geoRawImage={lastResult?.geoRawImage}
          task="image-feature-extraction"
          provider={mapProvider}
          embeddings={lastResult?.features && lastResult?.similarityMatrix && lastResult?.patchSize && allPatches.length > 0 ? {
            features: lastResult.features,
            similarityMatrix: lastResult.similarityMatrix,
            patchSize: lastResult.patchSize,
            allPatches: allPatches
          } : undefined}
        />
      )}
    </>
  );
};
