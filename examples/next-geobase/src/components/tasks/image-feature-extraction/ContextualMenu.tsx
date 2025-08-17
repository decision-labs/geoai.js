import React from 'react';
import { X, Target, Loader2 } from 'lucide-react';
import styles from '../../../app/tasks/image-feature-extraction/page.module.css';

interface ImageFeatureExtractionContextualMenuProps {
  position: { x: number; y: number } | null;
  threshold: number;
  isInitialized: boolean;
  isProcessing: boolean;
  onThresholdChange: (value: number) => void;
  onExtractFeatures: () => void;
  onClose: () => void;
}

export const ImageFeatureExtractionContextualMenu: React.FC<ImageFeatureExtractionContextualMenuProps> = ({
  position,
  threshold,
  isInitialized,
  isProcessing,
  onThresholdChange,
  onExtractFeatures,
  onClose,
}) => {
  if (!position) return null;

  return (
    <div 
      className="absolute z-50 bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg shadow-2xl p-4 min-w-[280px]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Extract Features</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Similarity Threshold Slider */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Similarity Threshold: {threshold}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={threshold}
          onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
          className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${styles.slider}`}
        />
        <p className="text-xs text-gray-500 mt-1">
          Higher values filter out less similar features
        </p>
      </div>
      
      {/* Extract Features Button */}
      <button
        onClick={onExtractFeatures}
        disabled={!isInitialized || isProcessing}
        className="w-full px-4 py-2 bg-teal-600 text-white rounded-md shadow-lg font-medium text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 border border-teal-500"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Target className="w-4 h-4" />
            <span>Extract Features</span>
          </>
        )}
      </button>
    </div>
  );
};
