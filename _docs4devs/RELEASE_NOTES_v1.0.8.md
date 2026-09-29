# GeoAI.js v1.0.8 Release Notes

**Date:** 2026-09-29  
**npm:** `geoai@1.0.8`

## Highlights

- **Image geolocation (GeoCLIP)** — estimate where an uploaded photo was taken entirely in the browser
- **Google Maps provider** — Map Tiles API session + 2D satellite XYZ tiles
- **OAM tile URL fix** — HOT Imagery item tiles no longer use the deprecated `@1x` path suffix

## What's New

### Image geolocation (`image-geolocation`)
- New task powered by [`Xenova/geoclip-large-patch14`](https://huggingface.co/Xenova/geoclip-large-patch14) (Q4 vision weights by default)
- Inputs: uploaded `Blob` / `File` (optional `topK`, optional map-provider `polygon`)
- Outputs ranked `predictions` with `gps: [latitude, longitude]` against a 100k GPS gallery
- Live demo: [`/tasks/image-geolocation`](https://docs.geobase.app/geoai-live/tasks/image-geolocation)
- Docs: [Image Geolocation](https://docs.geobase.app/geoai/supported-tasks/image-geolocation)

### Google Maps provider
- `provider: "google"` using the Map Tiles API (session token + satellite XYZ)
- Requires a Google Maps Platform API key with Map Tiles API enabled

### OAM fix
- Item tile templates now use `{z}/{x}/{y}` (HOT TiTiler rejects `{y}@1x` with HTTP 422)

## Upgrade

```bash
npm install geoai@1.0.8
# peer deps (if not already installed)
npm install @huggingface/transformers onnxruntime-web
```

### Image geolocation quickstart

```typescript
const pipeline = await geoai.pipeline(
  [{ task: "image-geolocation", modelParams: { dtype: "q4", device: "webgpu" } }],
  { provider: "esri" }
);

const result = await pipeline.inference({
  inputs: { image: uploadedFile, topK: 5 },
});

// result.predictions[0].gps → [lat, lon] (flip for GeoJSON maps)
```

## CDN

```html
<script src="https://unpkg.com/geoai@1.0.8/geoai.js"></script>
<!-- or -->
<script src="https://cdn.jsdelivr.net/npm/geoai@1.0.8/geoai.min.js"></script>
```

## Publish checklist

- [ ] PR #159 merged to `main`; CI green on `main`
- [ ] `pnpm build && pnpm test:build` green locally
- [ ] `git tag v1.0.8 && git push origin main && git push origin v1.0.8`
- [ ] `pnpm publish:pkg` (npm)
- [ ] `gh release create v1.0.8 --notes-file _docs4devs/RELEASE_NOTES_v1.0.8.md`
- [ ] After npm publish: set live-examples `"geoai": "1.0.8"`, `pnpm install`, commit
