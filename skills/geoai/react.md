# React + MapLibre

Use a **web worker** for inference (see [workers.md](workers.md)). There is **no**
`geoai/react` export — copy the hook pattern below or from the examples.

## Hook over the worker

```typescript
import { useEffect, useRef, useState } from 'react';

function useGeoAIWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('./geoai-worker.js', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'ready') setIsReady(true);
      if (type === 'result') {
        setResult(payload);
        setIsProcessing(false);
      }
      if (type === 'error') {
        setError(payload);
        setIsProcessing(false);
      }
    };
    return () => worker.terminate();
  }, []);

  const init = (tasks, providerParams) => {
    setIsReady(false);
    workerRef.current?.postMessage({
      type: 'init',
      payload: { tasks, providerParams },
    });
  };

  const runInference = (params) => {
    setIsProcessing(true);
    setError(null);
    workerRef.current?.postMessage({ type: 'inference', payload: params });
  };

  return { isReady, isProcessing, result, error, init, runInference };
}
```

Worker file contents: [workers.md](workers.md) (same `init` / `inference` protocol).

## Map UX pattern

1. MapLibre (+ draw control) for AOI polygon.
2. Convert the drawn polygon to a GeoJSON **Feature**.
3. `init([{ task }], providerParams)` once.
4. On draw complete / button: `runInference({ inputs: { polygon }, mapSourceParams })`.
5. Render `result.detections` as a GeoJSON source/layer.

## References

- Worker protocol: [workers.md](workers.md)
- Workers docs: https://docs.geobase.app/geoai/workers
- `examples/02-quickstart-with-workers`
- `examples/live-examples-nextjs` (`src/hooks/useGeoAIWorker.ts`)
- React quickstart: https://docs.geobase.app/geoai/frontend-frameworks/react-quickstart
