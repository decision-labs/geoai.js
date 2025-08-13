import React from 'react';

interface StatusMessageProps {
  type: 'success' | 'error' | 'info';
  message: string;
  className?: string;
}

const statusConfig = {
  success: {
    gradient: 'from-green-400 to-emerald-400',
    bg: 'from-green-50/80 to-emerald-50/80',
    border: 'border-green-300/40',
    dotColor: 'bg-green-500',
    textColor: 'text-green-700',
    animation: 'animate-ping',
  },
  error: {
    gradient: 'from-red-400 to-rose-400',
    bg: 'from-red-50/80 to-rose-50/80',
    border: 'border-red-300/40',
    dotColor: 'bg-red-500',
    textColor: 'text-red-700',
    animation: 'animate-pulse',
  },
  info: {
    gradient: 'from-blue-400 to-cyan-400',
    bg: 'from-blue-50/80 to-cyan-50/80',
    border: 'border-blue-300/40',
    dotColor: 'bg-blue-500',
    textColor: 'text-blue-700',
    animation: 'animate-pulse',
  },
};

export const StatusMessage: React.FC<StatusMessageProps> = ({
  type,
  message,
  className = '',
}) => {
  const config = statusConfig[type];

  return (
    <div className={`relative group ${className}`}>
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${config.gradient} rounded-lg blur opacity-15 ${type === 'success' ? 'animate-pulse' : ''}`}></div>
      <div className={`relative p-4 bg-gradient-to-r ${config.bg} backdrop-blur-sm border ${config.border} rounded-lg shadow-sm`}>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 ${config.dotColor} rounded-full ${config.animation}`}></div>
          <span className={`${config.textColor} ${type === 'success' ? 'font-medium' : 'text-sm'}`}>
            {type === 'error' && 'Error: '}{message}
          </span>
        </div>
      </div>
    </div>
  );
};
