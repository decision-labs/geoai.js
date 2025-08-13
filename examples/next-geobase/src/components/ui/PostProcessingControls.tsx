import React from 'react';
import { GlassmorphismCard } from './GlassmorphismCard';

interface PostProcessingControlsProps {
  minThreshold: number;
  maxThreshold: number;
  onMinThresholdChange: (value: number) => void;
  onMaxThresholdChange: (value: number) => void;
  className?: string;
}

export const PostProcessingControls: React.FC<PostProcessingControlsProps> = ({
  minThreshold,
  maxThreshold,
  onMinThresholdChange,
  onMaxThresholdChange,
  className = '',
}) => {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.min(Number(e.target.value), maxThreshold);
    onMinThresholdChange(newValue);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.max(Number(e.target.value), minThreshold);
    onMaxThresholdChange(newValue);
  };

  return (
    <GlassmorphismCard glowColor="purple" className={className}>
      <h3 className="font-semibold text-purple-900 mb-4 flex items-center">
        <span className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
        Filter by Confidence
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label htmlFor="min-threshold" className="text-xs text-purple-900 w-8">
            Min
          </label>
          <input
            id="min-threshold"
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={minThreshold}
            onChange={handleMinChange}
            className="flex-1 h-2 bg-purple-100 rounded-lg appearance-none cursor-pointer slider-purple"
          />
          <span className="text-purple-900 font-mono w-14 text-right text-sm">
            {minThreshold.toFixed(3)}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <label htmlFor="max-threshold" className="text-xs text-purple-900 w-8">
            Max
          </label>
          <input
            id="max-threshold"
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={maxThreshold}
            onChange={handleMaxChange}
            className="flex-1 h-2 bg-purple-100 rounded-lg appearance-none cursor-pointer slider-purple"
          />
          <span className="text-purple-900 font-mono w-14 text-right text-sm">
            {maxThreshold.toFixed(3)}
          </span>
        </div>
      </div>
      
      <div className="text-xs text-purple-800 mt-3">
        Only detections with confidence between min and max are shown.
      </div>
      
      <style jsx>{`
        .slider-purple::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8b5cf6, #a855f7);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3);
          border: 2px solid white;
        }
        
        .slider-purple::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8b5cf6, #a855f7);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3);
          border: 2px solid white;
        }
        
        .slider-purple::-webkit-slider-track {
          background: linear-gradient(to right, #ddd6fe, #c4b5fd);
          height: 6px;
          border-radius: 3px;
        }
        
        .slider-purple::-moz-range-track {
          background: linear-gradient(to right, #ddd6fe, #c4b5fd);
          height: 6px;
          border-radius: 3px;
        }
      `}</style>
    </GlassmorphismCard>
  );
};
