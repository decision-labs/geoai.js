import React from 'react';

interface GlassmorphismCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'green' | 'emerald' | 'teal' | 'red' | 'purple';
  padding?: 'sm' | 'md' | 'lg';
}

const glowColors = {
  green: 'from-green-400 to-emerald-400',
  emerald: 'from-emerald-400 to-teal-400',
  teal: 'from-teal-400 to-green-400',
  red: 'from-red-400 to-rose-400',
  purple: 'from-purple-400 to-violet-400',
};

const paddingClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export const GlassmorphismCard: React.FC<GlassmorphismCardProps> = ({
  children,
  className = '',
  glowColor = 'emerald',
  padding = 'lg',
}) => {
  return (
    <div className={`relative group ${className}`}>
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${glowColors[glowColor]} rounded-lg blur opacity-10 group-hover:opacity-15 transition duration-500`}></div>
      <div className={`relative backdrop-blur-sm bg-white/90 ${paddingClasses[padding]} rounded-lg border border-gray-200/50 shadow-sm`}>
        {children}
      </div>
    </div>
  );
};
