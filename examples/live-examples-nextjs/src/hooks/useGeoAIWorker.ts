import { ProviderParams, InferenceParams } from "geoai";
import { useEffect, useRef, useState, useCallback } from "react";

// Worker message types
export type WorkerMessageType = "init" | "inference" | "getEmbeddings";
export type WorkerResponseType =
  | "init_complete"
  | "inference_complete"
  | "embeddings_complete"
  | "error";

export interface WorkerMessage {
  type: WorkerMessageType;
  payload: any;
}

export interface WorkerResponse {
  type: WorkerResponseType;
  payload?: any;
}

export interface PipelineInitConfig {
  tasks: {
    task: string;
    modelId?: string;
    modelParams?: any;
  }[];
  providerParams: ProviderParams;
}

export interface GeoAIWorkerResult {
  detections?: GeoJSON.FeatureCollection;
  geoRawImage?: any;
  [key: string]: any;
}

export interface UseGeoAIWorkerReturn {
  // State
  isInitialized: boolean;
  isProcessing: boolean;
  error: string | null;
  lastResult: GeoAIWorkerResult | null;
  initializedTasks: string[];

  // Actions
  initializeModel: (config: PipelineInitConfig) => void;
  runInference: (params: InferenceParams) => void;
  getEmbeddings: (params: InferenceParams) => void;
  clearError: () => void;
  clearResult: () => void;
  reset: () => void;
}

/**
 * Custom hook for managing GeoAI worker lifecycle and communication
 * Provides clean separation of concerns for AI model operations
 */
export function useGeoAIWorker(): UseGeoAIWorkerReturn {
  const workerRef = useRef<Worker | null>(null);

  const lastInitConfigRef = useRef<PipelineInitConfig | null>(null);

  const providerParamsEqual = (a?: ProviderParams, b?: ProviderParams) => {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (e) {
      return false;
    }
  };

  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<GeoAIWorkerResult | null>(null);
  const [initializedTasks, setInitializedTasks] = useState<string[]>([]);

  // Initialize worker on mount
  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL("./worker.ts", import.meta.url));

      workerRef.current.onmessage = handleWorkerMessage;
      workerRef.current.onerror = handleWorkerError;
    } catch (err) {
      console.error("Failed to initialize worker:", err);
      setError(
        "Failed to initialize AI worker: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    }

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      // Clear large data structures
      setLastResult(null);
      setError(null);
      setIsInitialized(false);
      setIsProcessing(false);
      setInitializedTasks([]);
    };
  }, []);

  // Handle worker messages
  const handleWorkerMessage = useCallback((e: MessageEvent<WorkerResponse>) => {
    const { type, payload } = e.data;

    switch (type) {
      case "init_complete":
        setIsInitialized(true);
        setError(null);
        setInitializedTasks(payload?.tasks || []);
        console.log("[Hook] AI model initialized successfully with provider",lastInitConfigRef.current?.providerParams.provider);
        break;

      case "inference_complete":
        setIsProcessing(false);
        setLastResult(payload || null);
        setError(null);
        console.log("[Hook] Inference completed successfully");
        break;

      case "embeddings_complete":
        setIsProcessing(false);
        setLastResult(payload || null);
        setError(null);
        console.log("[Hook] Embeddings extraction completed successfully");
        break;

      case "error":
        setIsProcessing(false);
        setIsInitialized(false);
        setError(payload || "Unknown worker error occurred");
        console.error("[Hook] Worker error:", payload);
        break;

      default:
        console.warn("[Hook] Unknown worker message type:", type);
    }
  }, []);

  // Handle worker errors
  const handleWorkerError = useCallback((error: ErrorEvent) => {
    console.error("[Hook] Worker error event:", error);
    setError(`Worker error: ${error.message}`);
    setIsProcessing(false);
    setIsInitialized(false);
  }, []);

  // Initialize AI model
  const initializeModel = useCallback(
    (config: PipelineInitConfig) => {
      if (!workerRef.current) {
        setError("Worker not available");
        return;
      }

      if (isInitialized && lastInitConfigRef.current) {
        const sameProvider = providerParamsEqual(
          config.providerParams,
          lastInitConfigRef.current.providerParams
        );
        if (sameProvider) {
          console.warn("[Hook] Model already initialized with the same provider/config");
          return;
        }

        console.info("[Hook] Provider changed, re-initializing model with new provider");
        setIsInitialized(false);
        setInitializedTasks([]);
      }

      setError(null);

      const message: WorkerMessage = {
        type: "init",
        payload: config,
      };
      lastInitConfigRef.current = config;

      workerRef.current.postMessage(message);
    },
    [isInitialized]
  );

  // Run inference
  const runInference = useCallback(
    (params: InferenceParams) => {
      if (!workerRef.current) {
        setError("Worker not available");
        return;
      }

      if (!isInitialized) {
        setError("AI model not initialized. Please initialize first.");
        return;
      }

      if (isProcessing) {
        console.warn("[Hook] Inference already in progress");
        return;
      }

      console.log("[Hook] Running inference with params:", params);
      setIsProcessing(true);
      setError(null);

      const message: WorkerMessage = {
        type: "inference",
        payload: params,
      };

      workerRef.current.postMessage(message);
    },
    [isInitialized, isProcessing]
  );

  // Get embeddings from AI model
  const getEmbeddings = useCallback(
    (params: InferenceParams) => {
      if (!workerRef.current) {
        setError("Worker not available");
        return;
      }

      if (!isInitialized) {
        setError("AI model not initialized. Please initialize first.");
        return;
      }

      if (isProcessing) {
        console.warn("[Hook] Embeddings extraction already in progress");
        return;
      }

      console.log("[Hook] Getting embeddings with params:", params);
      setIsProcessing(true);
      setError(null);

      const message: WorkerMessage = {
        type: "getEmbeddings",
        payload: params,
      };

      workerRef.current.postMessage(message);
    },
    [isInitialized, isProcessing]
  );

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear only the result without resetting the model
  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = new Worker(
        new URL("./worker.ts", import.meta.url)
      );
      workerRef.current.onmessage = handleWorkerMessage;
      workerRef.current.onerror = handleWorkerError;
    }
    lastInitConfigRef.current = null;

    setIsInitialized(false);
    setIsProcessing(false);
    setError(null);
    setLastResult(null);
    setInitializedTasks([]);
  }, [handleWorkerMessage, handleWorkerError]);

  return {
    // State
    isInitialized,
    isProcessing,
    error,
    lastResult,
    initializedTasks,
    // Actions
    initializeModel,
    runInference,
    getEmbeddings,
    clearError,
    clearResult,
    reset,
  };
}

// Helper hook for common AI tasks with optimized parameters
export function useOptimizedGeoAI() {
  const worker = useGeoAIWorker();

  const runOptimizedInference = useCallback(
    (params: InferenceParams) => {
      // Optimize parameters based on task and zoom level
      const optimizedParams = getOptimalParams(
        worker.initializedTasks,
        params.mapSourceParams?.zoomLevel,
        params.postProcessingParams ?? {}
      );
      params.postProcessingParams = optimizedParams;

      worker.runInference(params);
    },
    [worker]
  );

  return {
    ...worker,
    runOptimizedInference,
  };
}

// Helper function to get optimal parameters for different tasks
function getOptimalParams(
  tasks: string[],
  zoomLevel: number | undefined,
  postProcessingParams: Record<string, unknown>
): Record<string, unknown> {
  let basePostProcessingParams: Record<string, unknown> = {
    ...postProcessingParams,
  };

  if (!tasks || tasks.length === 0 || !zoomLevel) {
    return basePostProcessingParams;
  }
  tasks.forEach(task => {
    console.log("[Hook] Optimizing parameters for task:", task);
    switch (task) {
      case "object-detection":
        basePostProcessingParams = {
          ...basePostProcessingParams,
          confidence: zoomLevel > 18 ? 0.6 : 0.8,
        };
        break;

      case "building-footprint-segmentation":
        basePostProcessingParams = {
          ...basePostProcessingParams,
          confidenceThreshold: 0.7,
          minArea: zoomLevel > 16 ? 50 : 100,
        };
        break;

      case "zero-shot-object-detection":
        basePostProcessingParams = {
          ...basePostProcessingParams,
          threshold: 0.2,
          topk: 15,
        };
        break;

      case "land-cover-classification":
        basePostProcessingParams = {
          ...basePostProcessingParams,
          minArea: zoomLevel > 15 ? 25 : 50,
        };
        break;

      case "mask-generation":
        basePostProcessingParams = {
          ...basePostProcessingParams,
          maxMasks: 3,
        };
        break;

      default:
        break;
    }
  });

  return {
    postProcessingParams: basePostProcessingParams,
  };
}