import React from 'react';

interface ConfidenceSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const ConfidenceSlider: React.FC<ConfidenceSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.min(max, Math.max(min, Number(e.target.value)));
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.min(max, Math.max(min, Number(e.target.value)));
    onChange(newValue);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Confidence Score
        </label>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInputChange}
          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>
      
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
      
      <p className="text-xs text-gray-600">
        Minimum confidence threshold for object detection
      </p>
      
      <style jsx>{`
        .slider-purple::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8b5cf6, #a855f7);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
          border: 2px solid white;
        }
        
        .slider-purple::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8b5cf6, #a855f7);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
          border: 2px solid white;
        }
      `}</style>
    </div>
  );
};
