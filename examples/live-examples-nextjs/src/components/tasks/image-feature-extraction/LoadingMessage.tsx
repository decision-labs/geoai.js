import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingMessageProps {
  isLoading: boolean;
  isVisible: boolean;
  onDismiss: () => void;
}

export const LoadingMessage: React.FC<LoadingMessageProps> = ({
  isLoading,
  isVisible,
  onDismiss,
}) => {
  if (!isVisible) return null;

  return (
    <div 
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg shadow-2xl px-6 py-4 cursor-pointer hover:bg-white/98 transition-colors duration-200"
      onClick={onDismiss}
      title="Click to dismiss"
    >
      <div className="flex items-center space-x-3">
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800">Loading precomputed embeddings...</span>
              <span className="text-xs text-gray-600 mt-1">Analyzing imagery for feature patterns</span>
            </div>
          </>
        ) : (
          <>
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800">Precomputed embeddings loaded!</span>
              <div className="flex items-center space-x-1 mt-1">
                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
                </svg>
                <span className="text-xs text-gray-600">Hover over areas to see similar embeddings</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
