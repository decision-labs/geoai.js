'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

interface CollapsibleAttributionProps {
  position?: 'bottom-center' | 'bottom-left';
  className?: string;
}

export default function CollapsibleAttribution({ 
  position = 'bottom-center',
  className = ''
}: CollapsibleAttributionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionClasses = {
    'bottom-center': 'absolute bottom-6 left-1/2 transform -translate-x-1/2',
    'bottom-left': 'absolute bottom-6 left-6'
  };

  const textAlignmentClasses = {
    'bottom-center': 'text-center',
    'bottom-left': 'text-left'
  };

  const flexJustificationClasses = {
    'bottom-center': 'justify-center',
    'bottom-left': 'justify-between'
  };

  const positionClass = positionClasses[position];

  return (
    <div className={`${positionClass} z-40 ${className}`}>
      {/* Collapsed state - just info icon */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-black/60 backdrop-blur-sm rounded-full p-2 text-white hover:bg-black/80 transition-colors duration-200"
          title="View attribution"
        >
          <Info className="w-4 h-4" />
        </button>
      )}

      {/* Expanded state - full attribution */}
      {isExpanded && (
        <div className={`bg-black/60 backdrop-blur-sm rounded px-3 py-2 pr-8 text-[12px] text-white max-w-2xl whitespace-normal ${textAlignmentClasses[position]} relative`}>
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-1 right-2 text-white/70 hover:text-white text-lg leading-none"
            title="Close"
          >
            ×
          </button>
          <span>
            Attribution: <a href="https://geobase.app/" target="_blank" rel="noreferrer" className="underline hover:text-blue-300">Geobase</a>, <a href="https://opengeoai.org/" target="_blank" rel="noreferrer" className="underline hover:text-blue-300">geoai</a>, <a href="https://www.mapbox.com/" target="_blank" rel="noreferrer" className="underline hover:text-blue-300">Mapbox</a>, <a href="https://www.esri.com/" target="_blank" rel="noreferrer" className="underline hover:text-blue-300">ESRI</a>, <a href="https://openaerialmap.org" target="_blank" rel="noreferrer" className="underline hover:text-blue-300">OpenAerialMap</a> and <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer" className="underline hover:text-blue-300">OpenStreetMap</a>
          </span>
        </div>
      )}
    </div>
  );
}
