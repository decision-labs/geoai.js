import { MapSource } from "./mapsource";

interface TmsConfig {
  baseUrl: string;
  extension?: string;
  apiKey?: string;
  attribution?: string;
  tileSize?: number;
  headers?: Record<string, string>;
  /**
   * Tile scheme to use.
   * - 'WebMercator': Web Mercator/XYZ (top-left origin, Y increases downward) - default for most modern services including Cesium
   * - 'TMS': TMS standard (bottom-left origin, Y increases upward) - traditional TMS
   * @default 'WebMercator'
   */
  scheme?: "WebMercator" | "TMS";
}

export class Tms extends MapSource {
  baseUrl: string;
  extension: string;
  apiKey?: string;
  attribution: string;
  tileSize: number;
  headers?: Record<string, string>;
  scheme: "WebMercator" | "TMS";

  constructor(config: TmsConfig) {
    super();
    this.baseUrl = config.baseUrl;
    this.extension = config.extension || 'png';
    this.apiKey = config.apiKey;
    this.attribution = config.attribution || 'TMS Provider';
    this.tileSize = config.tileSize || 256;
    this.headers = config.headers;
    this.scheme = config.scheme || "WebMercator";
  }

  protected getTileUrlFromTileCoords(
    tileCoords: [number, number, number],
    instance: Tms
  ): string {
    const [x, originalY, z] = tileCoords;

    // Convert Y coordinate based on tile scheme
    // latLngToTileXY in common.ts uses WebMercator/XYZ scheme (top-left origin)
    // If TMS scheme is requested, we need to flip the Y coordinate
    const y =
      instance.scheme === "TMS" ? Math.pow(2, z) - 1 - originalY : originalY;

    let url: string;
    
    // Check if baseUrl contains placeholders {x}, {y}, {z}
    if (instance.baseUrl.includes('{x}') || instance.baseUrl.includes('{y}') || instance.baseUrl.includes('{z}')) {
      // Use placeholder-based URL template
      url = instance.baseUrl
        .replaceAll('{z}', z.toString())
        .replaceAll('{x}', x.toString())
        .replaceAll('{y}', y.toString());
    } else {
      // Use traditional baseUrl + path construction for backward compatibility
      url = `${instance.baseUrl}/${z}/${x}/${y}.${instance.extension}`;
    }
    
    // Add API key as query parameter if provided
    if (instance.apiKey) {
      url += `?apikey=${instance.apiKey}`;
    }
    
    return url;
  }
}
