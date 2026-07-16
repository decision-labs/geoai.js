# GeoAI.js v1.0.6 Release Notes

**Date:** 2026-07-16  
**npm:** `geoai@1.0.6`

## Highlights

ChangeStar ViT-B building footprint segmentation — higher-quality building outlines as the new default for `building-footprint-segmentation`, with the lighter footprint model still available via `modelId`.

## What's New

### ChangeStar building footprints
- Hub model: `geobase/changestar-building-segmentation-vitb`
- Dense segmentation runner (`ChangeStarBuildingSegmentation`) with 1024px tiles
- Selected through the existing `building-footprint-segmentation` task via `modelId`

### Building segmentation factory
- Routes known Hub ids to the correct class (footprint vs ChangeStar)
- Fails fast on unknown `modelId` (no silent fallback)

### Default model change
- Omitting `modelId` now loads ChangeStar ViT-B
- For the previous lighter model, pass:

```typescript
const pipeline = await geoai.pipeline(
  [
    {
      task: 'building-footprint-segmentation',
      modelId: 'geobase/building-footprint-segmentation',
    },
  ],
  { provider: 'esri' }
);
```

### Examples
- `live-examples-nextjs` building-footprint page: toggle between ChangeStar (default) and the lighter footprint model

## Upgrade

```bash
npm install geoai@1.0.6
# peer deps (if not already installed)
npm install @huggingface/transformers onnxruntime-web
```

**Note:** This is a behavior change if you relied on the old default without setting `modelId`. Pin the lighter Hub id (above) to keep previous behavior.

## CDN

```html
<script src="https://unpkg.com/geoai@1.0.6/geoai.js"></script>
<!-- or -->
<script src="https://cdn.jsdelivr.net/npm/geoai@1.0.6/geoai.min.js"></script>
```

## Publish checklist

- [ ] `pnpm build && pnpm test && pnpm test:build` green on `main`
- [ ] `git tag v1.0.6 && git push origin main && git push origin v1.0.6`
- [ ] `pnpm publish:pkg` (npm)
- [ ] `gh release create v1.0.6 --notes-file _docs4devs/RELEASE_NOTES_v1.0.6.md`
- [ ] After npm publish: set live-examples `"geoai": "1.0.6"`, simplify `vercel.json` installCommand, `pnpm install`, commit
