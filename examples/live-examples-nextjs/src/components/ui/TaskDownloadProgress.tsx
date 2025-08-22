"use client";
// TODO: Review this wrapper component - it adds unnecessary complexity.
// Consider using ModelDownloadProgress directly with useModelDownloadProgress hook.
// This wrapper was created to handle task-specific model sizes but adds extra indirection.
import React, { useEffect } from 'react';
import { ModelDownloadProgress } from './ModelDownloadProgress';
import { useTaskDownloadProgress } from '../../hooks/useTaskDownloadProgress';
import { TaskType } from '../../utils/modelSizes';

interface TaskDownloadProgressProps {
  task: TaskType;
  className?: string;
  isInitialized?: boolean;
}

export function TaskDownloadProgress({ task, className = '', isInitialized = false }: TaskDownloadProgressProps) {
  const {
    downloadInfo,
    isEstimating,
    progress,
    startDownloadSimulation,
    stopDownloadSimulation,
  } = useTaskDownloadProgress(task);

  // Start simulation when component mounts and model is not initialized
  useEffect(() => {
    console.log(`[TaskDownloadProgress] ${task}: isInitialized=${isInitialized}, isEstimating=${isEstimating}`);
    if (!isInitialized && !isEstimating) {
      console.log(`[TaskDownloadProgress] ${task}: Starting download simulation`);
      startDownloadSimulation();
    }
  }, [isInitialized, isEstimating, startDownloadSimulation, task]);

  // Stop simulation when model is initialized
  useEffect(() => {
    if (isInitialized && isEstimating) {
      console.log(`[TaskDownloadProgress] ${task}: Stopping download simulation - model initialized`);
      stopDownloadSimulation();
    }
  }, [isInitialized, isEstimating, stopDownloadSimulation, task]);

  return (
    <ModelDownloadProgress
      downloadInfo={downloadInfo}
      progress={progress}
      isEstimating={isEstimating}
      className={className}
    />
  );
}
