"use client";

import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

interface InfoTooltipProps {
  title?: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  width?: string;
  className?: string;
  trigger?: 'hover' | 'click';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  children,
  position = 'bottom',
  width = 'w-64',
  className = '',
  trigger = 'click'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'absolute bottom-full right-0 mb-2';
      case 'bottom':
        return 'absolute top-full right-0 mt-2';
      case 'left':
        return 'absolute top-1/2 right-full mr-2 transform -translate-y-1/2';
      case 'right':
        return 'absolute top-1/2 left-full ml-2 transform -translate-y-1/2';
      default:
        return 'absolute top-full right-0 mt-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900';
      case 'bottom':
        return 'absolute bottom-full right-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900';
      case 'left':
        return 'absolute top-1/2 left-full w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900 transform -translate-y-1/2';
      case 'right':
        return 'absolute top-1/2 right-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900 transform -translate-y-1/2';
      default:
        return 'absolute bottom-full right-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900';
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsOpen(false);
    }
  };

  const handleClick = () => {
    if (trigger === 'click') {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Info 
        className={`w-3 h-3 text-gray-400 transition-colors ${
          trigger === 'hover' ? 'cursor-help' : 'cursor-pointer hover:text-gray-600'
        }`}
        onClick={handleClick}
      />
      {isOpen && (
        <div className={`${getPositionClasses()} px-4 py-3 bg-gray-900 text-white text-sm rounded-md z-50 ${width} ${
          trigger === 'hover' ? 'pointer-events-none' : ''
        }`}>
          {(title || trigger === 'click') && (
            <div className="flex justify-between items-start mb-2">
              {title && <span className="font-medium">{title}</span>}
              {trigger === 'click' && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="text-gray-400 hover:text-white transition-colors ml-auto cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          <div className={title || trigger === 'click' ? '' : 'pt-0'}>
            {children}
          </div>
          <div className={getArrowClasses()}></div>
        </div>
      )}
    </div>
  );
};
