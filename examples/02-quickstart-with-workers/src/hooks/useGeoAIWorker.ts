import { useState, useEffect, useRef } from "react";
 
export function useGeoAIWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
 
  useEffect(() => {
    workerRef.current = new Worker(new URL("./worker.ts", import.meta.url));
 
    workerRef.current.onmessage = e => {
      const { type, payload } = e.data;
 
      switch (type) {
        case "ready":
          setIsReady(true);
          break;
        case "result":
          setResult(payload);
          setIsProcessing(false);
          break;
        case "error":
          console.error("Worker error:", payload);
          setIsProcessing(false);
          break;
      }
    };
 
    return () => workerRef.current?.terminate();
  }, []);
 
  const initialize = (tasks: any[], providerParams: any) => {
    workerRef.current?.postMessage({
      type: "init",
      payload: { tasks, providerParams },
    });
  };
 
  const runInference = (params: any) => {
    if (!isReady) return;
    setIsProcessing(true);
    workerRef.current?.postMessage({
      type: "inference",
      payload: params,
    });
  };
 
  return { isReady, isProcessing, result, initialize, runInference };
}