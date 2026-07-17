import { MapSource } from "./mapsource";

export const DEFAULT_GOOGLE_TILE_API_URL = "https://tile.googleapis.com";
export const DEFAULT_GOOGLE_MAP_TYPE = "satellite";

export type GoogleMapType = "satellite" | "roadmap" | "terrain";

export interface GoogleConfig {
  /** Google Maps Platform API key with Map Tiles API enabled. */
  apiKey: string;
  /** 2D map type for the session (default `satellite`). */
  mapType?: GoogleMapType;
  language?: string;
  region?: string;
  /**
   * Optional pre-created session token. When omitted, the provider creates
   * one via `POST /v1/createSession` and refreshes near expiry.
   */
  sessionToken?: string;
  /** Session/tile API root (default https://tile.googleapis.com). */
  tileApiUrl?: string;
  /**
   * When false, omit `key=` from createSession/tile URLs (use with a same-origin
   * proxy that injects the server-side API key). Default true.
   */
  includeApiKey?: boolean;
  attribution?: string;
  tileSize?: number;
  headers?: Record<string, string>;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
}

export interface GoogleSessionResponse {
  session: string;
  expiry: string;
  tileWidth?: number;
  tileHeight?: number;
  imageFormat?: string;
}

export function buildGoogleCreateSessionUrl(
  apiKey: string,
  tileApiUrl: string = DEFAULT_GOOGLE_TILE_API_URL,
  includeApiKey: boolean = true
): string {
  const base = tileApiUrl.replace(/\/$/, "");
  if (!includeApiKey) {
    return `${base}/v1/createSession`;
  }
  return `${base}/v1/createSession?key=${encodeURIComponent(apiKey)}`;
}

export function buildGoogleTileUrl(
  z: number,
  x: number,
  y: number,
  sessionToken: string,
  apiKey: string,
  tileApiUrl: string = DEFAULT_GOOGLE_TILE_API_URL,
  includeApiKey: boolean = true
): string {
  const base = tileApiUrl.replace(/\/$/, "");
  let url =
    `${base}/v1/2dtiles/${z}/${x}/${y}` +
    `?session=${encodeURIComponent(sessionToken)}`;
  if (includeApiKey) {
    url += `&key=${encodeURIComponent(apiKey)}`;
  }
  return url;
}

/**
 * Create a Map Tiles API session for 2D tiles.
 * @see https://developers.google.com/maps/documentation/tile/session_tokens
 */
export async function createGoogleSession(options: {
  apiKey: string;
  mapType?: GoogleMapType;
  language?: string;
  region?: string;
  tileApiUrl?: string;
  includeApiKey?: boolean;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}): Promise<GoogleSessionResponse> {
  const apiKey = options.apiKey;
  const includeApiKey = options.includeApiKey !== false;
  if (includeApiKey && !apiKey) {
    throw new Error("Google Maps provider requires an apiKey");
  }

  const fetchImpl = options.fetchImpl || fetch;
  const url = buildGoogleCreateSessionUrl(
    apiKey,
    options.tileApiUrl || DEFAULT_GOOGLE_TILE_API_URL,
    includeApiKey
  );

  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: JSON.stringify({
      mapType: options.mapType || DEFAULT_GOOGLE_MAP_TYPE,
      language: options.language || "en-US",
      region: options.region || "US",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Google Map Tiles createSession failed (${response.status}): ${body || response.statusText}`
    );
  }

  const data = (await response.json()) as GoogleSessionResponse;
  if (!data.session) {
    throw new Error("Google Map Tiles createSession returned no session token");
  }
  return data;
}

export class GoogleMaps extends MapSource {
  apiKey: string;
  mapType: GoogleMapType;
  language: string;
  region: string;
  tileApiUrl: string;
  includeApiKey: boolean;
  attribution: string;
  tileSize: number;
  headers?: Record<string, string>;
  fetchImpl: typeof fetch;

  sessionToken?: string;
  /** Unix epoch seconds when the session expires. */
  sessionExpiry?: number;

  constructor(config: GoogleConfig) {
    super();
    this.includeApiKey = config.includeApiKey !== false;
    if (this.includeApiKey && !config.apiKey) {
      throw new Error("Google Maps provider requires an apiKey");
    }
    this.apiKey = config.apiKey || "";
    this.mapType = config.mapType || DEFAULT_GOOGLE_MAP_TYPE;
    this.language = config.language || "en-US";
    this.region = config.region || "US";
    this.tileApiUrl = (
      config.tileApiUrl || DEFAULT_GOOGLE_TILE_API_URL
    ).replace(/\/$/, "");
    this.attribution = config.attribution || "© Google Maps / Map Tiles API";
    this.tileSize = config.tileSize || 256;
    this.headers = config.headers;
    this.fetchImpl = config.fetchImpl || fetch;
    this.sessionToken = config.sessionToken;
  }

  private isSessionValid(skewSeconds: number = 60): boolean {
    if (!this.sessionToken) {
      return false;
    }
    if (this.sessionExpiry == null) {
      // Explicit sessionToken without expiry — trust until a request fails.
      return true;
    }
    const now = Math.floor(Date.now() / 1000);
    return this.sessionExpiry - skewSeconds > now;
  }

  /**
   * Ensure a valid Map Tiles session exists (create or refresh).
   */
  async ensureSession(): Promise<string> {
    if (this.isSessionValid()) {
      return this.sessionToken as string;
    }

    const data = await createGoogleSession({
      apiKey: this.apiKey,
      mapType: this.mapType,
      language: this.language,
      region: this.region,
      tileApiUrl: this.tileApiUrl,
      includeApiKey: this.includeApiKey,
      headers: this.headers,
      fetchImpl: this.fetchImpl,
    });

    this.sessionToken = data.session;
    const expiry = Number(data.expiry);
    this.sessionExpiry = Number.isFinite(expiry) ? expiry : undefined;
    if (typeof data.tileWidth === "number") {
      this.tileSize = data.tileWidth;
    }
    return this.sessionToken;
  }

  async getImage(
    polygon: any,
    bands?: number[],
    expression?: string,
    zoomLevel?: number,
    requiresSquare: boolean = false,
    stitch: boolean = true
  ) {
    await this.ensureSession();
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
    instance: GoogleMaps
  ): string {
    if (!instance.sessionToken) {
      throw new Error(
        "Google Maps session is not ready. Call ensureSession() or getImage() first."
      );
    }
    const [x, y, z] = tileCoords;
    return buildGoogleTileUrl(
      z,
      x,
      y,
      instance.sessionToken,
      instance.apiKey,
      instance.tileApiUrl,
      instance.includeApiKey
    );
  }
}
