import { MapSource } from "./mapsource";

interface EsriConfig {
  serviceUrl?: string;
  serviceName?: string;
  tileSize?: number;
  attribution?: string;
}

export class Esri extends MapSource {
  serviceUrl: string;
  serviceName: string;
  tileSize: number;
  attribution: string;

  constructor(config: EsriConfig) {
    super();
    this.serviceUrl =
      config.serviceUrl ||
      "https://server.arcgisonline.com/ArcGIS/rest/services";
    this.serviceName = config.serviceName || "World_Imagery";
    this.tileSize = config.tileSize || 256; // Default tile size
    this.attribution = config.attribution || "ESRI World Imagery";
  }

  protected getTileUrlFromTileCoords(
    tileCoords: [number, number, number],
    instance: Esri
  ): string {
    const [x, y, z] = tileCoords;
    return `${instance.serviceUrl}/${instance.serviceName}/MapServer/tile/${z}/${y}/${x}`;
  }
}
