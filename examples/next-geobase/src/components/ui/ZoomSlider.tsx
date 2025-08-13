import React from 'react';

interface ZoomSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const ZoomSlider: React.FC<ZoomSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 22,
  step = 1,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newValue = Math.round(percentage * max);
    onChange(Math.min(max, Math.max(min, newValue)));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const slider = e.currentTarget.parentElement!;
    const rect = slider.getBoundingClientRect();

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX - rect.left;
      const percentage = Math.min(1, Math.max(0, x / rect.width));
      const newValue = Math.round(percentage * max);
      onChange(newValue);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const getResolutionDescription = (zoom: number) => {
    if (zoom <= 8) return "Low resolution - Fast processing";
    if (zoom <= 15) return "Medium resolution - Balanced";
    return "High resolution - Detailed analysis";
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-600">
          Zoom Resolution
        </label>
        <span className="text-xs text-gray-500 bg-gray-100/80 px-2 py-1 rounded-full">
          Level {value}
        </span>
      </div>

      {/* Custom Progress Bar Slider */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="sr-only"
        />

        {/* Custom slider track */}
        <div
          className="w-full h-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full cursor-pointer relative overflow-hidden"
          onClick={handleClick}
        >
          {/* Progress fill */}
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-300 ease-out relative"
            style={{ width: `${(value / max) * 100}%` }}
          >
            {/* Animated shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-pulse"></div>
          </div>

          {/* Slider thumb */}
          <div
            className="absolute top-1/2 transform -translate-y-1/2 w-5 h-5 bg-white border-2 border-teal-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-all duration-200 hover:scale-110"
            style={{ left: `calc(${(value / max) * 100}% - 10px)` }}
            onMouseDown={handleMouseDown}
          >
            {/* Thumb inner glow */}
            <div className="absolute inset-0.5 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full opacity-60"></div>
          </div>
        </div>

        {/* Scale markers */}
        <div className="flex justify-between mt-2 px-1">
          <span className="text-xs text-gray-400">0</span>
          <span className="text-xs text-gray-400">5</span>
          <span className="text-xs text-gray-400">10</span>
          <span className="text-xs text-gray-400">15</span>
          <span className="text-xs text-gray-400">18</span>
          <span className="text-xs text-gray-400">{max}</span>
        </div>

      </div>
    </div>
  );
};
