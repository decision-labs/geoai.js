"use client";

import React, { useEffect, useRef } from 'react';
import { ModelDownloadProgress } from './ModelDownloadProgress';
import { useTaskDownloadProgress } from '../../hooks/useTaskDownloadProgress';
import { TaskType } from '../../utils/modelSizes';

interface TaskDownloadProgressProps {
  task: TaskType;
  className?: string;
  isInitialized?: boolean;
  error?: string | null;
}

export function TaskDownloadProgress({
  task,
  className = '',
  isInitialized = false,
  error = null,
}: TaskDownloadProgressProps) {
  const {
    downloadInfo,
    isEstimating,
    progress,
    startDownloadSimulation,
    stopDownloadSimulation,
  } = useTaskDownloadProgress(task);
  const startedRef = useRef(false);

  useEffect(() => {
    startedRef.current = false;
  }, [task]);

  useEffect(() => {
    if (!isInitialized && !error && !startedRef.current) {
      startedRef.current = true;
      startDownloadSimulation();
    }
  }, [isInitialized, error, startDownloadSimulation, task]);

  useEffect(() => {
    if ((isInitialized || error) && isEstimating) {
      stopDownloadSimulation();
    }
  }, [isInitialized, error, isEstimating, stopDownloadSimulation]);

  if (isInitialized || error) {
    return null;
  }

  return (
    <ModelDownloadProgress
      downloadInfo={downloadInfo}
      progress={progress}
      isEstimating={isEstimating}
      className={className}
    />
  );
}
