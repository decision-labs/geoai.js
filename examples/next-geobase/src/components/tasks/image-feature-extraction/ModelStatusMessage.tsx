import React from 'react';

interface ModelStatusMessageProps {
  isInitialized: boolean;
  isProcessing: boolean;
  isDrawingMode?: boolean;
  error?: string | null;
  className?: string;
}

export const ModelStatusMessage: React.FC<ModelStatusMessageProps> = ({
  isInitialized,
  isProcessing,
  isDrawingMode = false,
  error = null,
  className = '',
}) => {
  return (
    <div className={`bg-white/90 text-gray-800 px-3 py-2 rounded-md shadow-md backdrop-blur-sm border border-gray-200 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-yellow-500'} ${isProcessing ? 'animate-pulse' : ''}`}></div>
        <span className="text-sm font-medium">
          {isProcessing ? 'Processing...' : isInitialized ? 'Model Ready' : 'Initializing...'}
        </span>
      </div>
      {isDrawingMode && (
        <p className="text-xs text-gray-600 mt-1">Draw a polygon to extract features</p>
      )}
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}; 
