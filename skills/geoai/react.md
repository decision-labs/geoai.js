# React + web workers

`geoai` does not ship a React subpath export. Copy the worker + hook pattern from
the docs and examples.

## Why workers

Model download and inference are heavy. Keep them off the main thread so MapLibre
stays interactive.

## Minimal worker

`worker.ts`:

```typescript
import { geoai } from 'geoai';

let modelInstance: Awaited<ReturnType<typeof geoai.pipeline>> | null = null;

self.onmessage = async (e) => {
  const { type, payload } = e.data;
  try {
    if (type === 'init') {
      modelInstance = await geoai.pipeline(payload.tasks, payload.providerParams);
      self.postMessage({ type: 'ready' });
      return;
    }
    if (type === 'inference') {
      const result = await modelInstance!.inference(payload);
      self.postMessage({ type: 'result', payload: result });
      return;
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: error instanceof Error ? error.message : String(error),
    });
  }
};
```

Vite / bundlers: `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`.

## Hook sketch

```typescript
function useGeoAIWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
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
    workerRef.current?.postMessage({ type: 'init', payload: { tasks, providerParams } });
  };

  const runInference = (params) => {
    setIsProcessing(true);
    setError(null);
    workerRef.current?.postMessage({ type: 'inference', payload: params });
  };

  return { isReady, isProcessing, result, error, init, runInference };
}
```

## Map UX pattern

1. MapLibre (+ draw control) for AOI polygon.
2. Convert the drawn polygon to a GeoJSON **Feature**.
3. `init([{ task }], providerParams)` once.
4. On draw complete / button: `runInference({ inputs: { polygon }, mapSourceParams })`.
5. Render `result.detections` as a GeoJSON source/layer.

## Reference examples

- Workers docs: https://docs.geobase.app/geoai/workers
- `examples/02-quickstart-with-workers`
- `examples/live-examples-nextjs` (`src/hooks/useGeoAIWorker.ts`)
- React quickstart: https://docs.geobase.app/geoai/frontend-frameworks/react-quickstart
