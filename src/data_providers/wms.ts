import { pixelsToMeters, tileToBBox } from "global-mercator/index";
import { MapSource } from "./mapsource";

export type WmsVersion = "1.1.1" | "1.3.0";
export type WmsCrs = "EPSG:3857" | "EPSG:4326";

export interface WmsGetMapConfig {
  baseUrl: string;
  layers: string;
  version?: WmsVersion;
  crs?: WmsCrs;
  format?: string;
  styles?: string;
  transparent?: boolean;
  tileSize?: number;
  attribution?: string;
  headers?: Record<string, string>;
  extraParams?: Record<string, string>;
}

interface WmsConfig extends WmsGetMapConfig {}

export function formatWmsBbox(
  bbox: [number, number, number, number],
  crs: WmsCrs,
  version: WmsVersion
): string {
  const [minX, minY, maxX, maxY] = bbox;

  // WMS 1.3.0 with geographic CRS uses latitude, longitude axis order.
  if (version === "1.3.0" && crs === "EPSG:4326") {
    return `${minY},${minX},${maxY},${maxX}`;
  }

  return `${minX},${minY},${maxX},${maxY}`;
}

export function getTileBbox(
  tileCoords: [number, number, number],
  crs: WmsCrs,
  tileSize: number
): [number, number, number, number] {
  const [x, y, z] = tileCoords;

  if (crs === "EPSG:3857") {
    // global-mercator types list `validate` as the 2nd arg, but runtime uses `tileSize`.
    const toMeters = pixelsToMeters as (
      pixels: [number, number, number],
      tileSize?: number
    ) => [number, number];

    const min = toMeters([x * tileSize, y * tileSize, z], tileSize);
    const max = toMeters([(x + 1) * tileSize, (y + 1) * tileSize, z], tileSize);

    return [
      Math.min(min[0], max[0]),
      Math.min(min[1], max[1]),
      Math.max(min[0], max[0]),
      Math.max(min[1], max[1]),
    ];
  }

  return tileToBBox(tileCoords) as [number, number, number, number];
}

export function buildWmsGetMapUrl(
  config: WmsGetMapConfig,
  tileCoords: [number, number, number]
): string {
  const version = config.version ?? "1.1.1";
  const crs = config.crs ?? "EPSG:3857";
  const tileSize = config.tileSize ?? 256;
  const bbox = getTileBbox(tileCoords, crs, tileSize);
  const bboxParam = formatWmsBbox(bbox, crs, version);

  const params: Record<string, string> = {
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: version,
    LAYERS: config.layers,
    STYLES: config.styles ?? "",
    FORMAT: config.format ?? "image/png",
    WIDTH: tileSize.toString(),
    HEIGHT: tileSize.toString(),
    BBOX: bboxParam,
    ...(version === "1.3.0" ? { CRS: crs } : { SRS: crs }),
    ...(config.transparent ? { TRANSPARENT: "TRUE" } : {}),
    ...(config.extraParams ?? {}),
  };

  const url = new URL(config.baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

export class Wms extends MapSource {
  baseUrl: string;
  layers: string;
  version: WmsVersion;
  crs: WmsCrs;
  format: string;
  styles: string;
  transparent: boolean;
  attribution: string;
  tileSize: number;
  headers?: Record<string, string>;
  extraParams?: Record<string, string>;

  constructor(config: WmsConfig) {
    super();
    this.baseUrl = config.baseUrl;
    this.layers = config.layers;
    this.version = config.version ?? "1.1.1";
    this.crs = config.crs ?? "EPSG:3857";
    this.format = config.format ?? "image/png";
    this.styles = config.styles ?? "";
    this.transparent = config.transparent ?? false;
    this.attribution = config.attribution ?? "WMS Provider";
    this.tileSize = config.tileSize ?? 256;
    this.headers = config.headers;
    this.extraParams = config.extraParams;
  }

  protected getTileUrlFromTileCoords(
    tileCoords: [number, number, number],
    instance: Wms
  ): string {
    return buildWmsGetMapUrl(
      {
        baseUrl: instance.baseUrl,
        layers: instance.layers,
        version: instance.version,
        crs: instance.crs,
        format: instance.format,
        styles: instance.styles,
        transparent: instance.transparent,
        tileSize: instance.tileSize,
        extraParams: instance.extraParams,
      },
      tileCoords
    );
  }
}
