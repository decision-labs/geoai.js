# GeoAI.js map providers

Pass provider config as the second argument to `geoai.pipeline(tasks, providerParams)`.

## ESRI (no key)

```typescript
{ provider: 'esri' }
```

Public World Imagery. Best default for demos.

## Mapbox

```typescript
{
  provider: 'mapbox',
  apiKey: process.env.MAPBOX_TOKEN,
  style: 'mapbox://styles/mapbox/satellite-v9',
}
```

## Geobase (your COG)

```typescript
{
  provider: 'geobase',
  projectRef: process.env.GEOBASE_PROJECT_REF,
  apikey: process.env.GEOBASE_API_KEY,
  cogImagery: 'https://path-to-your-cog.tif',
}
```

Use when the user has Geobase credentials and Cloud Optimized GeoTIFF imagery.
Supports multispectral bands / expressions via `mapSourceParams`.

## TMS / XYZ tiles

Preferred: URL template with `{z}/{x}/{y}`:

```typescript
{
  provider: 'tms',
  baseUrl: 'https://tile.example.com/tiles/{z}/{x}/{y}.png',
  apiKey: 'optional',
  tileSize: 256,
  attribution: 'Custom TMS',
}
```

Legacy base URL + extension still works:

```typescript
{
  provider: 'tms',
  baseUrl: 'https://tile.example.com/tiles',
  extension: 'png',
}
```

See serving options: https://docs.geobase.app/geoai/map-providers/serving-raster-tiles

## WMS

```typescript
{
  provider: 'wms',
  baseUrl: 'https://www.wms.nrw.de/geobasis/wms_nw_dop',
  layers: 'nw_dop_rgb',
  version: '1.3.0',
  crs: 'EPSG:3857',
  attribution: '© Geobasis NRW',
}
```

Discover layer names via `GetCapabilities`. Prefer TMS when XYZ tiles already exist.

## OpenAerialMap (OAM / HOT Imagery)

Public aerial orthophotos via STAC + TiTiler. No API key.

```typescript
// Auto: STAC-search AOI → best item tiles (mosaic fallback)
{ provider: 'oam' }

// Pin a known STAC item
{ provider: 'oam', itemId: '67826781a07cc20001818cdb' }

// Collection mosaic only
{ provider: 'oam', mosaic: true }
```

Docs: https://docs.geobase.app/geoai/map-providers/oam
Example: `examples/07-oam-quickstart`

## Google Maps (Map Tiles API)

Global satellite imagery. Requires a Google Maps Platform API key with Map Tiles API enabled.

```typescript
{
  provider: 'google',
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
  // optional: mapType: 'satellite',
  // optional: sessionToken: '...',
}
```

Creates a session on first fetch (`/v1/createSession`), then requests
`/v1/2dtiles/{z}/{x}/{y}`. Follow Google attribution and caching policies.
Docs: https://docs.geobase.app/geoai/map-providers/google

## Map source params (all providers)

```typescript
mapSourceParams: {
  zoomLevel?: number, // omit for auto
  bands?: number[],
  expression?: string, // e.g. '(B4-B1)/(B4+B1)'
}
```

Typical detection zoom for aerial imagery: **16–20** (often 18).
