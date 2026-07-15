# GeoAI.js v1.0.5 Release Notes

**Date:** 2026-07-15  
**npm:** `geoai@1.0.5`

## Highlights

WMS support — run GeoAI inference on OGC WMS GetMap imagery, with NRW orthophotos as the reference integration.

## What's New

### WMS map provider
- New `provider: "wms"` with `WmsParams` (`baseUrl`, `layers`, `version`, `crs`, `format`, etc.)
- EPSG:3857 tile bbox via `pixelsToMeters` (aligned with MapLibre `{bbox-epsg-3857}`)
- Registered in model pipeline / `base_model` provider switch

### Examples & docs
- **`examples/06-wms-quickstart`** — MapLibre 4.7+, NRW `nw_dop_rgb`, draw-to-detect, NRW-bounded Nominatim geocoder
- **`live-examples-nextjs`** — TMS and WMS (NRW) selectable in all task demos
- Docs: [WMS provider](https://docs.geobase.app/geoai/map-providers/wms), map-providers table, serving-raster-tiles cross-links

### Tests
- `test/wms.test.ts` — URL building, tile fetch, and pipeline inference smoke tests against Geobasis NRW

## Upgrade

```bash
npm install geoai@1.0.5
# peer deps (if not already installed)
npm install @huggingface/transformers onnxruntime-web
```

### WMS quickstart

```typescript
const pipeline = await geoai.pipeline([{ task: 'building-detection' }], {
  provider: 'wms',
  baseUrl: 'https://www.wms.nrw.de/geobasis/wms_nw_dop',
  layers: 'nw_dop_rgb',
  version: '1.3.0',
  crs: 'EPSG:3857',
  format: 'image/png',
});
```

See `examples/06-wms-quickstart` and issue [#153](https://github.com/decision-labs/geoai.js/issues/153).

## CDN

```html
<script src="https://unpkg.com/geoai@1.0.5/geoai.js"></script>
<!-- or -->
<script src="https://cdn.jsdelivr.net/npm/geoai@1.0.5/geoai.min.js"></script>
```

## Publish checklist (remaining)

- [x] `pnpm build && pnpm test && pnpm test:build` green on `main` (165 tests passed)
- [ ] `git commit` + `git tag v1.0.5 && git push origin main && git push origin v1.0.5`
- [ ] `pnpm publish:pkg` (npm)
- [ ] `gh release create v1.0.5 --notes-file _docs4devs/RELEASE_NOTES_v1.0.5.md`
