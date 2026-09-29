"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { ESRI_CONFIG } from "../../../config";
import { useGeoAIWorker } from "../../../hooks/useGeoAIWorker";
import {
  CollapsibleAttribution,
  TaskDownloadProgress,
} from "../../../components";

type Prediction = { gps: [number, number]; score: number };

const MORAINE_LAKE_TEST_IMAGE =
  "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/moraine-lake.png";

export default function ImageGeolocationPage() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const {
    isInitialized,
    isProcessing,
    error,
    lastResult,
    initializeModel,
    runInference,
  } = useGeoAIWorker();

  useEffect(() => {
    const supportsWebGpu =
      typeof navigator !== "undefined" && "gpu" in navigator;
    initializeModel({
      tasks: [
        {
          task: "image-geolocation",
          modelParams: {
            dtype: "q4",
            ...(supportsWebGpu ? { device: "webgpu" as const } : {}),
          },
        },
      ],
      providerParams: ESRI_CONFIG,
    });
  }, [initializeModel]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const selectImage = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) =>
    selectImage(event.target.files?.[0]);

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    selectImage(event.dataTransfer.files[0]);
  };

  const loadTestImage = async () => {
    setSampleError(null);
    try {
      const response = await fetch(MORAINE_LAKE_TEST_IMAGE);
      if (!response.ok) {
        throw new Error(`Unable to load test image (${response.status})`);
      }
      selectImage(
        new File([await response.blob()], "moraine-lake.png", {
          type: "image/png",
        })
      );
    } catch (loadError) {
      setSampleError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load test image"
      );
    }
  };

  const predictions = lastResult?.predictions as Prediction[] | undefined;
  const predictionGeoJson = predictions
    ? JSON.stringify(
        {
          type: "FeatureCollection",
          features: predictions.map((prediction, index) => ({
            type: "Feature",
            properties: { rank: index + 1, score: prediction.score },
            geometry: {
              type: "Point",
              coordinates: [prediction.gps[1], prediction.gps[0]],
            },
          })),
        },
        null,
        2
      )
    : null;

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Tiles © Esri",
          },
        },
        layers: [{ id: "satellite", type: "raster", source: "satellite" }],
      },
      center: [-116.1835, 51.3274],
      zoom: 4,
    });
    return () => map.current?.remove();
  }, []);

  useEffect(() => {
    if (!map.current || !predictions?.length) return;

    const renderPredictionPoints = () => {
      const mapInstance = map.current;
      if (!mapInstance) return;

      const points: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: "FeatureCollection",
        features: predictions.map((prediction, index) => ({
          type: "Feature",
          properties: { rank: index + 1, primary: index === 0 },
          geometry: {
            type: "Point",
            coordinates: [prediction.gps[1], prediction.gps[0]],
          },
        })),
      };

      const source = mapInstance.getSource(
        "geoclip-predictions"
      ) as maplibregl.GeoJSONSource | undefined;

      if (source) {
        source.setData(points);
      } else {
        mapInstance.addSource("geoclip-predictions", {
          type: "geojson",
          data: points,
        });
        mapInstance.addLayer({
          id: "geoclip-prediction-pins",
          type: "circle",
          source: "geoclip-predictions",
          paint: {
            "circle-radius": [
              "case",
              ["get", "primary"],
              11,
              9,
            ],
            "circle-color": [
              "case",
              ["get", "primary"],
              "#0072B2",
              "#E69F00",
            ],
            "circle-stroke-color": "#111827",
            "circle-stroke-width": 3,
          },
        });
      }

      const bounds = new maplibregl.LngLatBounds();
      predictions.forEach((prediction) => {
        bounds.extend([prediction.gps[1], prediction.gps[0]]);
      });
      mapInstance.fitBounds(bounds, {
        padding: 80,
        maxZoom: 18,
        duration: 800,
      });
    };

    if (map.current.isStyleLoaded()) renderPredictionPoints();
    else map.current.once("load", renderPredictionPoints);
  }, [predictions]);

  const actionLabel = isProcessing
    ? "Locating…"
    : isInitialized
      ? "Find location"
      : "Loading model…";

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#0c0f0d] text-stone-100">
      <aside className="flex h-full w-full max-w-[420px] shrink-0 flex-col overflow-y-auto border-r border-stone-800 bg-[#121614] p-5">
        <a
          href="/geoai-live"
          className="text-sm text-stone-400 transition hover:text-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          ← All examples
        </a>

        <header className="mt-6">
          <p className="font-mono text-[11px] font-medium tracking-wide text-emerald-400">
            GeoCLIP · Q4
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-50">
            Image geolocation
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-400">
            Upload a photo and estimate where it was taken — entirely in the
            browser.
          </p>
        </header>

        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="mt-6 flex min-h-[240px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-stone-700 bg-[#0c0f0d] p-4 text-center transition hover:border-stone-500 focus-within:border-emerald-600"
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onInputChange}
          />
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Selected image"
              className="max-h-[280px] max-w-full rounded-md object-contain"
            />
          ) : (
            <>
              <strong className="text-sm font-medium text-stone-200">
                Drop an image here
              </strong>
              <span className="mt-1 text-sm text-stone-500">
                or click to choose a file
              </span>
            </>
          )}
        </label>

        <p className="mt-3 truncate text-sm text-stone-500">
          {image ? image.name : "No image selected"}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadTestImage}
            className="rounded-md border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 transition hover:border-stone-500 hover:bg-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            Try Moraine Lake
          </button>
          <button
            type="button"
            onClick={() =>
              image && runInference({ inputs: { image, topK: 5 } })
            }
            disabled={!image || !isInitialized || isProcessing}
            className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            {actionLabel}
          </button>
        </div>

        {sampleError ? (
          <p className="mt-3 text-sm text-red-400">{sampleError}</p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <section className="mt-6 min-h-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-stone-200">
                Prediction GeoJSON
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Ranked GPS points from GeoCLIP.
              </p>
            </div>
            {predictionGeoJson ? (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(predictionGeoJson)}
                className="rounded-md border border-stone-700 px-3 py-1.5 text-sm font-medium text-stone-200 transition hover:border-stone-500 hover:bg-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                Copy
              </button>
            ) : null}
          </div>
          {!predictionGeoJson && !error ? (
            <p className="mt-5 text-sm text-stone-500">
              Run inference to see GeoJSON results.
            </p>
          ) : null}
          {predictionGeoJson ? (
            <pre className="mt-3 max-h-[380px] overflow-auto rounded-md border border-stone-800 bg-[#0c0f0d] p-3 font-mono text-xs leading-5 text-stone-400">
              {predictionGeoJson}
            </pre>
          ) : null}
        </section>
      </aside>

      <section className="relative h-full min-w-0 flex-1">
        <div ref={mapContainer} className="h-full w-full" />
        <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-stone-800 bg-[#0c0f0d]/90 px-3 py-2 text-sm text-stone-200 backdrop-blur-sm">
          <p className="font-medium text-stone-50">Predicted locations</p>
          <p className="mt-0.5 text-xs text-stone-400">
            Map fitted to GeoCLIP prediction points
          </p>
        </div>
        <div className="absolute left-1/2 top-6 z-50 -translate-x-1/2">
          <TaskDownloadProgress
            task="image-geolocation"
            className="min-w-80"
            isInitialized={isInitialized}
          />
        </div>
        <CollapsibleAttribution position="bottom-left" />
      </section>
    </main>
  );
}
