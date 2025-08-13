import React from 'react';

interface BackgroundEffectsProps {
  className?: string;
}

export const BackgroundEffects: React.FC<BackgroundEffectsProps> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-50/30 via-emerald-50/20 to-teal-50/30 animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-100/10 via-white/20 to-gray-50"></div>
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-green-200/10 to-emerald-300/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-1/3 right-1/3 w-24 h-24 bg-gradient-to-r from-teal-200/10 to-green-300/10 rounded-full blur-xl animate-pulse delay-1000"></div>
    </div>
  );
};
