# GeoAI.js Roadmap

Planned work that is not yet scheduled. Items here are ideas and backlog — not commitments or release dates.

## Documentation

### Use cases & guides

Today the docs cover quickstarts, concepts, map providers, and per-task API reference, but there is no dedicated **Use Cases** or end-to-end **Guides** section.

**Planned:**

- Add a top-level **Use Cases** (or **Guides**) section to the docs site
- Write workflow-oriented pages (problem → provider → task → output), e.g.:
  - Building inventory with orthophotos (WMS/TMS + building detection)
  - Solar panel assessment for utilities
  - Maritime monitoring with ship detection
  - Embedding-based similarity search (DINOv3 + Geobase)
- Link each use case to live examples and repo quickstarts (`01-quickstart`, `05-tms-quickstart`, `06-wms-quickstart`, etc.)
- Expand per-task “use case” tables beyond `image-feature-extraction` (today only that page has a full `## Use Cases` section)

**Related:** [docs README TODOs](../docs/README.md), [model docs checklist](../docs/checklist_model_docs.md)

---

## Model pipeline

### Quantization pipeline

Browser inference is sensitive to model size and load time. Several Hub models already ship `model_quantized` ONNX weights (e.g. cross-encoder in `geobase-agent.ts`), but there is no unified way to produce, validate, or select quantized variants across GeoAI tasks.

**Planned:**

- Define a **quantization pipeline** for GeoAI models (ONNX dynamic/static quantization via `onnxruntime` tooling)
- Document when to use quantized vs full-precision weights per task (accuracy vs latency trade-offs)
- Integrate quantized model selection in the registry / `base_model` loading path (e.g. `model_file_name`, dtype, execution provider hints)
- CI or release step to quantize supported models and publish artifacts (or pin known-good quantized Hub revisions)
- Benchmark suite: load time, inference latency, and task metrics before/after quantization

**Related:** [OpenCV optimization roadmap](./OPENCV_OPTIMIZATION_ROADMAP.md) (bundle size), `task-classifier/explore-collab-notebook.ipynb` (prototype ONNX quantize)

---

## Other tracked roadmaps

| Area | Doc |
| ---- | --- |
| OpenCV.js bundle size & preprocessing | [OPENCV_OPTIMIZATION_ROADMAP.md](./OPENCV_OPTIMIZATION_ROADMAP.md) |
