import React, { memo } from 'react';
import { BarChart3, Pencil } from 'lucide-react';

interface InitialButtonsProps {
  isInitialized: boolean;
  isButtonDisabled: boolean;
  onShowPrecomputedEmbeddings: () => void;
  onStartDrawingMode: () => void;
}

// Memoized component to prevent unnecessary re-renders
export const InitialButtons = memo<InitialButtonsProps>(({
  isInitialized,
  isButtonDisabled,
  onShowPrecomputedEmbeddings,
  onStartDrawingMode,
}) => {
  // Early return for loading state
  if (!isInitialized) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-gray-200/50">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Image Feature Extraction</h2>
            <p className="text-gray-600">Loading model...</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // Common button styles
  const buttonBaseClasses = "flex-1 px-8 py-6 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-lg flex flex-col items-center space-y-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseOver={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-gray-200/50"
        onMouseEnter={(e) => e.stopPropagation()}
        onMouseLeave={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onMouseOver={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Image Feature Extraction</h2>
          <p className="text-gray-600">Choose how you'd like to explore image features</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onShowPrecomputedEmbeddings}
            disabled={isButtonDisabled}
            className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700`}
          >
            <BarChart3 className="w-8 h-8" />
            <span>Show Precomputed Embeddings</span>
            <span className="text-sm opacity-80">Explore existing feature analysis</span>
          </button>
          <button
            onClick={onStartDrawingMode}
            disabled={isButtonDisabled}
            className={`${buttonBaseClasses} bg-green-600 hover:bg-green-700`}
          >
            <Pencil className="w-8 h-8" />
            <span>Draw Region to See Features</span>
            <span className="text-sm opacity-80">Analyze your own areas of interest</span>
          </button>
        </div>
      </div>
    </div>
  );
});

InitialButtons.displayName = 'InitialButtons';
