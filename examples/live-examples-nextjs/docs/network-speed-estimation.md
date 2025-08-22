# Network Speed Estimation & Model Loading Progress

This feature provides real-time network speed estimation and model loading progress tracking for AI model initialization across all tasks.

## Features

- **Network Speed Estimation**: Automatically measures network speed by downloading a small test file
- **Model Loading Progress Simulation**: Shows estimated progress based on network speed and model size
- **Real-time Updates**: Progress updates every 100ms during loading simulation
- **Fallback Handling**: Uses fallback speed if network estimation fails

## Implementation

### NetworkSpeedEstimator Class

Located in `src/utils/networkUtils.ts`, this utility class provides:

- `estimateNetworkSpeed()`: Downloads a 1MB test file to measure network speed
- `calculateModelDownloadInfo()`: Calculates estimated download time for a given model size
- `simulateDownloadProgress()`: Simulates download progress over time

### useModelDownloadProgress Hook

A React hook that manages model loading progress state:

```typescript
const {
  downloadInfo,
  isEstimating,
  progress,
  startDownloadSimulation,
  stopDownloadSimulation,
} = useModelDownloadProgress(100); // 100MB model size
```

### ModelDownloadProgress Component

A UI component that displays:
- Model loading progress bar
- Network speed information
- Estimated time to load
- Model size indicator

## Usage

The feature is automatically integrated into all task pages:

1. When a user first loads a page or changes map providers
2. The system estimates network speed by downloading a 1MB test file
3. Based on the estimated speed and known model size, it calculates loading time
4. A progress bar shows estimated model loading progress
5. Progress simulation stops when the AI model is actually initialized

## Configuration

- **Test File Size**: 1MB (configurable in `TEST_FILE_SIZE_BYTES`)
- **Test File URL**: https://httpbin.org/bytes/1048576
- **Fallback Speed**: 10 Mbps (if estimation fails)
- **Update Interval**: 100ms for progress updates
- **Model Sizes**: Varies by task (9.22MB to 104MB)

## Error Handling

- If network speed estimation fails, falls back to 10 Mbps
- Gracefully handles network errors and timeouts
- Minimum speed of 0.1 Mbps to prevent division by zero
- Automatic cleanup of intervals on component unmount

## Future Enhancements

- More accurate progress tracking with actual model loading events
- Caching of network speed estimates
- Support for different network conditions (WiFi vs mobile)
- Real-time model loading status from the AI pipeline
