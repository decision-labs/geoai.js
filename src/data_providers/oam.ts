import { bbox as turfBbox } from "@turf/bbox";
import { MapSource } from "./mapsource";

export const DEFAULT_OAM_STAC_URL = "https://api.imagery.hotosm.org/stac";
export const DEFAULT_OAM_RASTER_URL = "https://api.imagery.hotosm.org/raster";
export const DEFAULT_OAM_COLLECTION = "openaerialmap";
export const DEFAULT_OAM_ASSET = "visual";

export interface OamConfig {
  /** STAC API root (default HOT Imagery STAC). */
  stacUrl?: string;
  /** TiTiler / raster API root. */
  rasterUrl?: string;
  /** STAC collection id. */
  collection?: string;
  /** Asset key used for RGB tiles (default `visual`). */
  asset?: string;
  /**
   * Pin to a specific STAC item id. Skips search.
   * Item tiles: `/collections/{collection}/items/{itemId}/tiles/...`
   */
  itemId?: string;
  /**
   * When true, use the collection mosaic tile endpoint (no STAC search).
   * When false (default) and `itemId` is unset, search STAC for the AOI and
   * use the best matching item's tiles (fallback to mosaic if none found).
   */
  mosaic?: boolean;
  attribution?: string;
  tileSize?: number;
  headers?: Record<string, string>;
}

export interface OamStacItem {
  id: string;
  bbox?: number[];
  properties?: {
    gsd?: number;
    title?: string;
    created?: string;
    datetime?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function buildOamMosaicTileUrlTemplate(
  rasterUrl: string = DEFAULT_OAM_RASTER_URL,
  collection: string = DEFAULT_OAM_COLLECTION,
  asset: string = DEFAULT_OAM_ASSET
): string {
  const base = rasterUrl.replace(/\/$/, "");
  return `${base}/collections/${encodeURIComponent(collection)}/tiles/WebMercatorQuad/{z}/{x}/{y}?assets=${encodeURIComponent(asset)}`;
}

export function buildOamItemTileUrlTemplate(
  itemId: string,
  rasterUrl: string = DEFAULT_OAM_RASTER_URL,
  collection: string = DEFAULT_OAM_COLLECTION,
  asset: string = DEFAULT_OAM_ASSET
): string {
  const base = rasterUrl.replace(/\/$/, "");
  return `${base}/collections/${encodeURIComponent(collection)}/items/${encodeURIComponent(itemId)}/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?assets=${encodeURIComponent(asset)}`;
}

/** Prefer higher resolution (lower gsd), then newer imagery. */
export function pickBestOamItem(
  features: OamStacItem[]
): OamStacItem | undefined {
  if (!features.length) return undefined;
  return features.slice().sort((a, b) => {
    const gsdA =
      typeof a.properties?.gsd === "number"
        ? a.properties.gsd
        : Number.POSITIVE_INFINITY;
    const gsdB =
      typeof b.properties?.gsd === "number"
        ? b.properties.gsd
        : Number.POSITIVE_INFINITY;
    if (gsdA !== gsdB) return gsdA - gsdB;
    const dateA = Date.parse(
      String(a.properties?.created || a.properties?.datetime || 0)
    );
    const dateB = Date.parse(
      String(b.properties?.created || b.properties?.datetime || 0)
    );
    return dateB - dateA;
  })[0];
}

export async function searchOamItems(
  bbox: number[],
  options: {
    stacUrl?: string;
    collection?: string;
    limit?: number;
    headers?: Record<string, string>;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<OamStacItem[]> {
  const stacUrl = (options.stacUrl || DEFAULT_OAM_STAC_URL).replace(/\/$/, "");
  const collection = options.collection || DEFAULT_OAM_COLLECTION;
  const limit = options.limit ?? 10;
  const fetchImpl = options.fetchImpl || fetch;

  const response = await fetchImpl(`${stacUrl}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/geo+json",
      ...(options.headers || {}),
    },
    body: JSON.stringify({
      collections: [collection],
      bbox,
      limit,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `OAM STAC search failed (${response.status}): ${body || response.statusText}`
    );
  }

  const data = (await response.json()) as { features?: OamStacItem[] };
  return data.features || [];
}

export class Oam extends MapSource {
  stacUrl: string;
  rasterUrl: string;
  collection: string;
  asset: string;
  itemId?: string;
  mosaic: boolean;
  attribution: string;
  tileSize: number;
  headers?: Record<string, string>;

  /** Resolved XYZ template with `{z}/{x}/{y}` placeholders. */
  tileUrlTemplate: string;

  private resolvedForBboxKey?: string;

  constructor(config: OamConfig = {}) {
    super();
    this.stacUrl = (config.stacUrl || DEFAULT_OAM_STAC_URL).replace(/\/$/, "");
    this.rasterUrl = (config.rasterUrl || DEFAULT_OAM_RASTER_URL).replace(
      /\/$/,
      ""
    );
    this.collection = config.collection || DEFAULT_OAM_COLLECTION;
    this.asset = config.asset || DEFAULT_OAM_ASSET;
    this.itemId = config.itemId;
    this.mosaic = config.mosaic === true;
    this.attribution = config.attribution || "OpenAerialMap / HOT Imagery";
    this.tileSize = config.tileSize || 256;
    this.headers = config.headers;

    if (this.itemId) {
      this.tileUrlTemplate = buildOamItemTileUrlTemplate(
        this.itemId,
        this.rasterUrl,
        this.collection,
        this.asset
      );
    } else if (this.mosaic) {
      this.tileUrlTemplate = buildOamMosaicTileUrlTemplate(
        this.rasterUrl,
        this.collection,
        this.asset
      );
    } else {
      // Placeholder until STAC resolve in getImage()
      this.tileUrlTemplate = buildOamMosaicTileUrlTemplate(
        this.rasterUrl,
        this.collection,
        this.asset
      );
    }
  }

  /**
   * Resolve tile URL template for an AOI via STAC (unless mosaic/itemId pin).
   */
  async resolveTileTemplate(polygon: GeoJSON.Feature): Promise<string> {
    if (this.itemId) {
      this.tileUrlTemplate = buildOamItemTileUrlTemplate(
        this.itemId,
        this.rasterUrl,
        this.collection,
        this.asset
      );
      return this.tileUrlTemplate;
    }

    if (this.mosaic) {
      this.tileUrlTemplate = buildOamMosaicTileUrlTemplate(
        this.rasterUrl,
        this.collection,
        this.asset
      );
      return this.tileUrlTemplate;
    }

    const bbox = turfBbox(polygon);
    const bboxKey = bbox.map(n => n.toFixed(6)).join(",");
    if (this.resolvedForBboxKey === bboxKey && this.tileUrlTemplate) {
      return this.tileUrlTemplate;
    }

    const features = await searchOamItems(bbox, {
      stacUrl: this.stacUrl,
      collection: this.collection,
      headers: this.headers,
    });
    const best = pickBestOamItem(features);

    if (best?.id) {
      this.itemId = best.id;
      this.tileUrlTemplate = buildOamItemTileUrlTemplate(
        best.id,
        this.rasterUrl,
        this.collection,
        this.asset
      );
    } else {
      this.tileUrlTemplate = buildOamMosaicTileUrlTemplate(
        this.rasterUrl,
        this.collection,
        this.asset
      );
    }

    this.resolvedForBboxKey = bboxKey;
    return this.tileUrlTemplate;
  }

  async getImage(
    polygon: any,
    bands?: number[],
    expression?: string,
    zoomLevel?: number,
    requiresSquare: boolean = false,
    stitch: boolean = true
  ) {
    await this.resolveTileTemplate(polygon);
    return super.getImage(
      polygon,
      bands,
      expression,
      zoomLevel,
      requiresSquare,
      stitch
    );
  }

  protected getTileUrlFromTileCoords(
    tileCoords: [number, number, number],
    instance: Oam
  ): string {
    const [x, y, z] = tileCoords;
    return instance.tileUrlTemplate
      .replaceAll("{z}", z.toString())
      .replaceAll("{x}", x.toString())
      .replaceAll("{y}", y.toString());
  }
}
