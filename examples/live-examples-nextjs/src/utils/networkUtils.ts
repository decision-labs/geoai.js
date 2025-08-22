"use client";
import { useState, useEffect, useRef, useCallback } from 'react';

export interface NetworkSpeedInfo {
  speedMbps: number;
  estimatedDownloadTime: number; // in seconds
  progress: number; // 0-100
}

export interface ModelDownloadInfo {
  modelSizeMB: number;
  estimatedTimeSeconds: number;
  progress: number;
  speedMbps: number;
}

/**
 * Simple network speed estimation utility
 * Uses a small test file to estimate download speed
 */
export class NetworkSpeedEstimator {
  private static readonly TEST_FILE_SIZE_BYTES = 1024 * 1024; // 1MB test file
  private static readonly TEST_FILE_URL = 'https://httpbin.org/bytes/1048576'; // 1MB file
  private static readonly FALLBACK_SPEED_MBPS = 10; // Fallback speed if test fails

  /**
   * Estimate network speed by downloading a small test file
   */
  static async estimateNetworkSpeed(): Promise<number> {
    try {
      const startTime = performance.now();
      
      const response = await fetch(this.TEST_FILE_URL, {
        method: 'GET',
        cache: 'no-cache', // Ensure fresh download
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Read the response to completion
      await response.arrayBuffer();
      
      const endTime = performance.now();
      const downloadTimeMs = endTime - startTime;
      const downloadTimeSeconds = downloadTimeMs / 1000;
      
      // Calculate speed in Mbps
      const speedMbps = (this.TEST_FILE_SIZE_BYTES * 8) / (downloadTimeSeconds * 1000000);
      
      console.log(`[NetworkSpeed] Estimated speed: ${speedMbps.toFixed(2)} Mbps`);
      return Math.max(speedMbps, 0.1); // Minimum 0.1 Mbps
    } catch (error) {
      console.warn('[NetworkSpeed] Speed estimation failed, using fallback:', error);
      return this.FALLBACK_SPEED_MBPS;
    }
  }

  /**
   * Calculate estimated download time for a model
   */
  static calculateModelDownloadInfo(
    modelSizeMB: number,
    networkSpeedMbps: number
  ): ModelDownloadInfo {
    const modelSizeBits = modelSizeMB * 8 * 1024 * 1024; // Convert MB to bits
    const estimatedTimeSeconds = modelSizeBits / (networkSpeedMbps * 1000000);
    
    return {
      modelSizeMB,
      estimatedTimeSeconds,
      progress: 0,
      speedMbps: networkSpeedMbps,
    };
  }

  /**
   * Simulate download progress over time
   */
  static simulateDownloadProgress(
    modelSizeMB: number,
    networkSpeedMbps: number,
    elapsedTimeSeconds: number
  ): number {
    const modelSizeBits = modelSizeMB * 8 * 1024 * 1024;
    const downloadedBits = networkSpeedMbps * 1000000 * elapsedTimeSeconds;
    const progress = Math.min((downloadedBits / modelSizeBits) * 100, 100);
    
    return Math.max(0, Math.min(100, progress));
  }
}

/**
 * Hook for tracking model download progress
 */
export function useModelDownloadProgress(modelSizeMB: number = 100) {
  const [downloadInfo, setDownloadInfo] = useState<ModelDownloadInfo | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startDownloadSimulation = useCallback(async () => {
    setIsEstimating(true);
    
    try {
      // Estimate network speed
      const speedMbps = await NetworkSpeedEstimator.estimateNetworkSpeed();
      
      // Calculate download info
      const info = NetworkSpeedEstimator.calculateModelDownloadInfo(modelSizeMB, speedMbps);
      setDownloadInfo(info);
      
      // Start progress simulation
      const startTime = Date.now();
      setProgress(0);
      
      progressIntervalRef.current = setInterval(() => {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const currentProgress = NetworkSpeedEstimator.simulateDownloadProgress(
          modelSizeMB,
          speedMbps,
          elapsedSeconds
        );
        
        setProgress(currentProgress);
        
        // Stop when complete
        if (currentProgress >= 100) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          setIsEstimating(false);
        }
      }, 100); // Update every 100ms
      
    } catch (error) {
      console.error('[ModelDownload] Failed to estimate download:', error);
      setIsEstimating(false);
    }
  }, [modelSizeMB]);

  const stopDownloadSimulation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsEstimating(false);
    setProgress(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return {
    downloadInfo,
    isEstimating,
    progress,
    startDownloadSimulation,
    stopDownloadSimulation,
  };
}
