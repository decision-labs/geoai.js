import React, { memo } from 'react';

// Extracted SVG icons for better performance
const BarChartIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const PencilIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

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
  const buttonBaseClasses = "flex-1 px-8 py-6 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-lg flex flex-col items-center space-y-2 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-gray-200/50">
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
            <BarChartIcon />
            <span>Show Precomputed Embeddings</span>
            <span className="text-sm opacity-80">Explore existing feature analysis</span>
          </button>
          <button
            onClick={onStartDrawingMode}
            disabled={isButtonDisabled}
            className={`${buttonBaseClasses} bg-green-600 hover:bg-green-700`}
          >
            <PencilIcon />
            <span>Draw Region to See Features</span>
            <span className="text-sm opacity-80">Analyze your own areas of interest</span>
          </button>
        </div>
      </div>
    </div>
  );
});

InitialButtons.displayName = 'InitialButtons';
