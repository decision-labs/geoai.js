# TMS Image Saving Demo

## Configuration
- Base URL: https://tile.sentinelmap.eu/2016/summer/rgb
- Extension: jpg
- API Key: Configured

## Usage Example
```typescript
import { Tms } from "@geobase-js/geoai";

const tms = new Tms({
  baseUrl: "https://tile.sentinelmap.eu/2016/summer/rgb",
  extension: "jpg",
  apiKey: "your-api-key",
});

const polygon = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [[
      [13.38, 52.51],
      [13.381, 52.51],
      [13.381, 52.511],
      [13.38, 52.511],
      [13.38, 52.51],
    ]],
    type: "Polygon",
  },
};

const image = await tms.getImage(polygon, undefined, undefined, 14);
await image.save("tms-image.png");
```

## Working Tile Coordinates
- Zoom Level: 14
- X: 8800
- Y: 5371 (Web Mercator) / 11012 (TMS)
- URL: https://tile.sentinelmap.eu/2016/summer/rgb/14/8800/11012.jpg?key=875e6b1c0ef7a112d1267ec91353809d
