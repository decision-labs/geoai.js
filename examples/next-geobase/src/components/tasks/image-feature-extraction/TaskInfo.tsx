import React from 'react';

interface TaskInfoProps {
  taskName: string;
  modelId?: string;
  isInitialized: boolean;
  defaultModelName?: string;
  className?: string;
}

export const TaskInfo: React.FC<TaskInfoProps> = ({
  taskName,
  modelId,
  isInitialized,
  defaultModelName = 'DINOv3 Model',
  className = '',
}) => {
  return (
    <div className={`bg-white/90 backdrop-blur-sm border border-gray-200 rounded-md shadow-md p-3 ${className}`}>
      <div className="text-right">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">
          {taskName}
        </h3>
        {modelId && (
          <p className="text-xs text-gray-600 font-mono">
            {modelId}
          </p>
        )}
        {!modelId && isInitialized && (
          <p className="text-xs text-gray-500 italic">
            {defaultModelName}
          </p>
        )}
      </div>
    </div>
  );
};
