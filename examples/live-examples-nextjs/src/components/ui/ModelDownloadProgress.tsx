import React from 'react';
import { ModelDownloadInfo } from '../../utils/networkUtils';

interface ModelDownloadProgressProps {
  downloadInfo: ModelDownloadInfo | null;
  progress: number;
  isEstimating: boolean;
  className?: string;
}

export function ModelDownloadProgress({
  downloadInfo,
  progress,
  isEstimating,
  className = '',
}: ModelDownloadProgressProps) {
  console.log(`[ModelDownloadProgress] isEstimating=${isEstimating}, progress=${progress}, downloadInfo=`, downloadInfo);
  if (!isEstimating || !downloadInfo) {
    console.log(`[ModelDownloadProgress] Not rendering: isEstimating=${isEstimating}, downloadInfo=`, downloadInfo);
    return null;
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes}m`;
    } else {
      const hours = Math.ceil(seconds / 3600);
      return `${hours}h`;
    }
  };

  const formatSpeed = (speedMbps: number): string => {
    if (speedMbps >= 1000) {
      return `${(speedMbps / 1000).toFixed(1)} Gbps`;
    }
    return `${speedMbps.toFixed(1)} Mbps`;
  };

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-200/50 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">
          Loading AI Model
        </h3>
        <span className="text-xs text-gray-500">
          {downloadInfo.modelSizeMB}MB
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Progress Info */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center space-x-4">
          <span>{progress.toFixed(1)}%</span>
          <span>•</span>
          <span>{formatSpeed(downloadInfo.speedMbps)}</span>
        </div>
        <span>
          ~{formatTime(downloadInfo.estimatedTimeSeconds)} to load
        </span>
      </div>
      
      {/* Network Info */}
      <div className="mt-2 text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Initializing AI pipeline...</span>
        </div>
      </div>
    </div>
  );
}
