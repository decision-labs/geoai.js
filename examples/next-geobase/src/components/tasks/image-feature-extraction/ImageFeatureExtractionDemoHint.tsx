import React, { useEffect, useState } from 'react';

interface ImageFeatureExtractionDemoHintProps {
  isVisible: boolean;
  onClose: () => void;
  duration?: number; // in milliseconds
}

export const ImageFeatureExtractionDemoHint: React.FC<ImageFeatureExtractionDemoHintProps> = ({
  isVisible,
  onClose,
  duration = 3000,
}) => {
  const [progress, setProgress] = useState<number>(100);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible) {
      setProgress(100);
      
      // Start progress animation
      const startTime = Date.now();
      
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
      }, 50); // Update every 50ms for smooth animation
      
      // Auto-close after duration
      const autoCloseTimeout = setTimeout(() => {
        onClose();
        setProgress(100);
        clearInterval(progressInterval);
      }, duration);
      
      setTimeoutId(autoCloseTimeout);
      
      // Cleanup function
      return () => {
        clearInterval(progressInterval);
        clearTimeout(autoCloseTimeout);
      };
    }
  }, [isVisible, duration, onClose]);

  const handleClose = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    onClose();
    setProgress(100);
  };

  if (!isVisible) return null;

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg shadow-2xl px-6 py-4">
      <div className="relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-sm">
            <div className="font-medium text-gray-800">Demo layer loaded!</div>
            <div className="text-gray-600">Hover over patches to see similarity heatmap</div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-blue-600 h-1 rounded-full transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
