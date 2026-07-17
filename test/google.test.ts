import { describe, expect, it, vi } from "vitest";
import {
  GoogleMaps,
  buildGoogleCreateSessionUrl,
  buildGoogleTileUrl,
  createGoogleSession,
  DEFAULT_GOOGLE_TILE_API_URL,
} from "../src/data_providers/google";
import { geoai } from "@/geoai";

describe("Google Maps helpers", () => {
  it("builds createSession URL", () => {
    const url = buildGoogleCreateSessionUrl("test-key");
    expect(url).toBe(
      `${DEFAULT_GOOGLE_TILE_API_URL}/v1/createSession?key=test-key`
    );
  });

  it("builds 2d tile URL with session and key", () => {
    const url = buildGoogleTileUrl(16, 35041, 24355, "sess-abc", "test-key");
    expect(url).toContain("/v1/2dtiles/16/35041/24355?");
    expect(url).toContain("session=sess-abc");
    expect(url).toContain("key=test-key");
  });

  it("createGoogleSession posts mapType and returns session", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        session: "sess-123",
        expiry: String(Math.floor(Date.now() / 1000) + 3600),
        tileWidth: 256,
        tileHeight: 256,
        imageFormat: "png",
      }),
    });

    const data = await createGoogleSession({
      apiKey: "test-key",
      mapType: "satellite",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(data.session).toBe("sess-123");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain("/v1/createSession?key=test-key");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      mapType: "satellite",
      language: "en-US",
      region: "US",
    });
  });

  it("createGoogleSession throws on HTTP error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: async () => "API key invalid",
    });

    await expect(
      createGoogleSession({
        apiKey: "bad",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toThrow(/createSession failed \(403\)/);
  });
});

describe("GoogleMaps provider", () => {
  it("requires apiKey", () => {
    expect(() => new GoogleMaps({ apiKey: "" })).toThrow(/apiKey/);
  });

  it("uses provided sessionToken without createSession", async () => {
    const fetchImpl = vi.fn();
    const google = new GoogleMaps({
      apiKey: "test-key",
      sessionToken: "prebuilt-session",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const token = await google.ensureSession();
    expect(token).toBe("prebuilt-session");
    expect(fetchImpl).not.toHaveBeenCalled();

    const url = google["getTileUrlFromTileCoords"]([1, 2, 3], google);
    expect(url).toContain("/v1/2dtiles/3/1/2?");
    expect(url).toContain("session=prebuilt-session");
  });

  it("creates and caches a session", async () => {
    const expiry = Math.floor(Date.now() / 1000) + 7200;
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        session: "sess-new",
        expiry: String(expiry),
        tileWidth: 256,
      }),
    });

    const google = new GoogleMaps({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const first = await google.ensureSession();
    const second = await google.ensureSession();
    expect(first).toBe("sess-new");
    expect(second).toBe("sess-new");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("refreshes session when expired", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session: "sess-old",
          expiry: String(Math.floor(Date.now() / 1000) - 10),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session: "sess-fresh",
          expiry: String(Math.floor(Date.now() / 1000) + 3600),
        }),
      });

    const google = new GoogleMaps({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    // First call stores an already-expired token
    await google.ensureSession();
    const refreshed = await google.ensureSession();
    expect(refreshed).toBe("sess-fresh");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws if tile URL requested before session", () => {
    const google = new GoogleMaps({ apiKey: "test-key" });
    expect(() => google["getTileUrlFromTileCoords"]([0, 0, 1], google)).toThrow(
      /session is not ready/
    );
  });
});

describe("Google Maps pipeline wiring", () => {
  it("initializes a pipeline with provider google", async () => {
    const pipeline = await geoai.pipeline([{ task: "object-detection" }], {
      provider: "google",
      apiKey: "test-key",
      sessionToken: "sess-test",
    });
    expect(pipeline).toBeDefined();
    expect(typeof pipeline.inference).toBe("function");
  }, 120_000);
});
