# GeoAI.js + deck.gl demo

Minimal browser demo pairing [deck.gl](https://deck.gl) tiles/layers with GeoAI.js oil-storage-tank detection (ESRI imagery).

Related: issue [#112](https://github.com/decision-labs/geoai.js/issues/112), PR [#119](https://github.com/decision-labs/geoai.js/pull/119).

## Run locally

Serve this folder over HTTP (ES modules + import maps need a server):

```bash
cd examples/deckgl-demo
npx --yes serve -p 5175 .
# open http://localhost:5175
```

## Notes

- Uses CDN `geoai@1.0.6` + deck.gl 9.1
- Draw a polygon over tanks near Dubai (default view), then finish to run inference
- `codepen.html` is a single-file variant for CodePen / paste-bin use
