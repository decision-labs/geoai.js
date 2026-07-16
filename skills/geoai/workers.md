# Web Workers (background inference)

Run `geoai.pipeline` / `inference` in a **Worker** so model download and ONNX
inference do not block the UI thread (map pan/zoom, draw tools, etc.).

Prefer this for any interactive map app. Main-thread inference is fine only for
CLIs, scripts, or tiny demos.

## Message protocol

| Main → worker | Worker → main |
|---------------|---------------|
| `{ type: 'init', payload: { tasks, providerParams } }` | `{ type: 'ready' }` |
| `{ type: 'inference', payload: InferenceParams }` | `{ type: 'result', payload }` |
| | `{ type: 'error', payload: string }` |

`tasks` is the same array passed to `geoai.pipeline` (e.g. `[{ task: 'object-detection' }]`).

## Worker module

`geoai-worker.js` (or `.ts`):

```javascript
import { geoai } from 'geoai';

let pipeline = null;

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  try {
    if (type === 'init') {
      pipeline = await geoai.pipeline(payload.tasks, payload.providerParams);
      self.postMessage({ type: 'ready' });
      return;
    }

    if (type === 'inference') {
      if (!pipeline) {
        throw new Error('Worker not initialized. Send init first.');
      }
      const result = await pipeline.inference(payload);
      self.postMessage({ type: 'result', payload: result });
      return;
    }

    throw new Error(`Unknown worker message type: ${type}`);
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: error instanceof Error ? error.message : String(error),
    });
  }
};
```

## Vanilla JS (no React)

```javascript
const worker = new Worker(new URL('./geoai-worker.js', import.meta.url), {
  type: 'module',
});

function initGeoAI(tasks, providerParams) {
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'ready') {
        worker.removeEventListener('message', onMessage);
        resolve();
      }
      if (type === 'error') {
        worker.removeEventListener('message', onMessage);
        reject(new Error(payload));
      }
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({ type: 'init', payload: { tasks, providerParams } });
  });
}

function runInference(params) {
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'result') {
        worker.removeEventListener('message', onMessage);
        resolve(payload);
      }
      if (type === 'error') {
        worker.removeEventListener('message', onMessage);
        reject(new Error(payload));
      }
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({ type: 'inference', payload: params });
  });
}

// Usage
await initGeoAI([{ task: 'object-detection' }], { provider: 'esri' });

const result = await runInference({
  inputs: { polygon: geoJsonPolygonFeature },
  mapSourceParams: { zoomLevel: 18 },
});

console.log(result.detections);

// When leaving the page / tearing down the map:
// worker.terminate();
```

### Bundler notes

- **Vite / modern bundlers**: `new Worker(new URL('./geoai-worker.js', import.meta.url), { type: 'module' })` (shown above).
- **Without a bundler**: host the worker as a classic or module script URL you control; peer deps (`@huggingface/transformers`, `onnxruntime-web`) must resolve inside the worker context (import maps or bundled worker).
- **CDN / CodePen-style**: often keep inference on the main thread for simplicity, or use a blob/module worker if the host allows.

## React

Wrap the same worker in a hook — see [react.md](react.md).

## Gotchas

- Init once; reuse the worker for many `inference` calls.
- Do not `postMessage` large transferable ImageBitmaps unless you need them — GeoAI fetches tiles inside the worker from the provider.
- Polygon must still be a GeoJSON **Feature** in `inputs.polygon`.
- Terminate the worker on teardown to release WASM/model memory.

## References

- Docs: https://docs.geobase.app/geoai/workers
- `examples/02-quickstart-with-workers`
- `examples/live-examples-nextjs` (`src/hooks/useGeoAIWorker.ts`)
