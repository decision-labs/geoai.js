# GeoAI.js v1.0.7 Release Notes

**Date:** 2026-07-17  
**npm:** `geoai@1.0.7`

## Highlights

OpenAerialMap (OAM) support — run GeoAI inference on community aerial orthophotos from HOT Imagery (STAC + TiTiler), no API key required.

## What's New

### OAM map provider
- New `provider: "oam"` with auto STAC search (best GSD, then newest), pinned `itemId`, or `mosaic: true`
- Defaults to HOT Imagery STAC + raster APIs (`openaerialmap` collection, `visual` asset)
- Registered in the model pipeline / provider switch

### Examples & docs
- **`examples/07-oam-quickstart`** — MapLibre + Rome orthophoto + draw-to-detect (item / mosaic / auto modes)
- **`live-examples-nextjs`** — **OAM (HOT)** provider option (flies to Rome; mosaic tiles)
- Docs: [OAM provider](https://docs.geobase.app/geoai/map-providers/oam), map-providers table, serving-raster-tiles cross-links
- Skill: `skills/geoai/providers.md` OAM section

### Docs build
- Fixed Vercel docs deploy: `remark` packages live in `docs/`, and `generate-llms-txt` runs from `docs/scripts/` so Node resolves modules when the project root is `docs/`

### Tests
- `test/oam.test.ts` — STAC selection, mosaic/item modes, and pipeline smoke coverage

## Upgrade

```bash
npm install geoai@1.0.7
# peer deps (if not already installed)
npm install @huggingface/transformers onnxruntime-web
```

### OAM quickstart

```typescript
const pipeline = await geoai.pipeline([{ task: 'building-detection' }], {
  provider: 'oam',
  // optional: itemId: '67826781a07cc20001818cdb',
  // optional: mosaic: true,
});
```

Coverage is sparse — stay near known uploads (e.g. Rome) or pick an item from [HOT STAC search](https://api.imagery.hotosm.org/stac/search).

See `examples/07-oam-quickstart` and [OAM docs](https://docs.geobase.app/geoai/map-providers/oam).

## CDN

```html
<script src="https://unpkg.com/geoai@1.0.7/geoai.js"></script>
<!-- or -->
<script src="https://cdn.jsdelivr.net/npm/geoai@1.0.7/geoai.min.js"></script>
```

## Publish checklist

- [ ] `pnpm build && pnpm test && pnpm test:build` green on `main`
- [ ] `git tag v1.0.7 && git push origin main && git push origin v1.0.7`
- [ ] `pnpm publish:pkg` (npm)
- [ ] `gh release create v1.0.7 --notes-file _docs4devs/RELEASE_NOTES_v1.0.7.md`
- [ ] After npm publish: set live-examples `"geoai": "1.0.7"`, `pnpm install`, commit
