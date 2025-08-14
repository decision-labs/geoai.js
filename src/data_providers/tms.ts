import { MapSource } from "./mapsource";

interface TmsConfig {
  baseUrl: string;
  extension?: string;
  attribution?: string;
  headers?: Record<string, string>;
  apiKey?: string;
}

export class Tms extends MapSource {
  baseUrl: string;
  extension: string;
  attribution: string;
  headers?: Record<string, string>;
  apiKey?: string;

  constructor(config: TmsConfig) {
    super();
    this.baseUrl = config.baseUrl;
    this.extension = config.extension || "jpg";
    this.attribution = config.attribution || "TMS";
    this.headers = config.headers;
    this.apiKey = config.apiKey;
  }

  public getTileUrlFromTileCoords(
    tileCoords: [number, number, number],
    instance: Tms
  ): string {
    const [x, y, z] = tileCoords;

    // TMS uses bottom-left origin, but Web Mercator uses top-left
    // We need to flip the Y coordinate for Web Mercator compatibility
    const tmsY = Math.pow(2, z) - 1 - y;

    let url = `${instance.baseUrl}/${z}/${x}/${tmsY}.${instance.extension}`;

    // Add API key as query parameter if provided
    if (instance.apiKey) {
      url += `?key=${instance.apiKey}`;
    }

    return url;
  }
}
