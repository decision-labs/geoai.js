import { MapSource } from "./mapsource";

export class Mapbox extends MapSource {
  apiKey: string;
  style: string;

  constructor(apiKey: string, style: string) {
    super();
    this.apiKey = apiKey;
    this.style = style;
  }

  protected getTileUrlFromTileCoords(
    tileCoords: [number, number, number],
    instance: Mapbox
  ): string {
    const [x, y, z] = tileCoords;
    return `https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}.png?access_token=${instance.apiKey}`;
  }
}
