import { describe, it, expect } from 'vitest';
import { NetworkSpeedEstimator } from './networkUtils';

// Simple test to verify the utility functions work
describe('NetworkSpeedEstimator', () => {
  it('should calculate model download info correctly', () => {
    const modelSizeMB = 100;
    const networkSpeedMbps = 10;
    
    const result = NetworkSpeedEstimator.calculateModelDownloadInfo(modelSizeMB, networkSpeedMbps);
    
    expect(result.modelSizeMB).toBe(100);
    expect(result.speedMbps).toBe(10);
    expect(result.estimatedTimeSeconds).toBeGreaterThan(0);
    expect(result.progress).toBe(0);
  });

  it('should simulate download progress correctly', () => {
    const modelSizeMB = 100;
    const networkSpeedMbps = 10;
    const elapsedTimeSeconds = 5;
    
    const progress = NetworkSpeedEstimator.simulateDownloadProgress(
      modelSizeMB,
      networkSpeedMbps,
      elapsedTimeSeconds
    );
    
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
  });

  it('should handle edge cases', () => {
    // Test with very slow connection
    const slowProgress = NetworkSpeedEstimator.simulateDownloadProgress(100, 0.1, 10);
    expect(slowProgress).toBeGreaterThanOrEqual(0);
    
    // Test with very fast connection
    const fastProgress = NetworkSpeedEstimator.simulateDownloadProgress(100, 1000, 1);
    expect(fastProgress).toBeGreaterThanOrEqual(0);
    
    // Test with zero time
    const zeroProgress = NetworkSpeedEstimator.simulateDownloadProgress(100, 10, 0);
    expect(zeroProgress).toBe(0);
  });

  it('should calculate correct download time for different speeds', () => {
    // Test with 10 Mbps
    const result10Mbps = NetworkSpeedEstimator.calculateModelDownloadInfo(100, 10);
    expect(result10Mbps.estimatedTimeSeconds).toBeCloseTo(83.9, 1); // ~84 seconds for 100MB at 10Mbps
    
    // Test with 100 Mbps
    const result100Mbps = NetworkSpeedEstimator.calculateModelDownloadInfo(100, 100);
    expect(result100Mbps.estimatedTimeSeconds).toBeCloseTo(8.388, 2); // ~8 seconds for 100MB at 100Mbps
  });
});
