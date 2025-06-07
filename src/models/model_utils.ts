import * as ort from "onnxruntime-web";
import { onnxModel } from "@/core/types";
import { get, set } from "idb-keyval";

export const loadOnnxModel = async (url: string): Promise<onnxModel> => {
  console.log("[loadOnnxModel] Starting model load from URL:", url);

  // Only set WASM paths in browser environment
  // console.log({ window });
  if (typeof self !== "undefined") {
    console.log("[loadOnnxModel] Running in browser environment");
    ort.env.wasm.wasmPaths =
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
    console.log("[loadOnnxModel] Set WASM paths for browser environment");
  } else {
    console.log(
      "[loadOnnxModel] Running in non-browser environment, skipping WASM path configuration"
    );
  }

  // Ensure ONNX environment is ready
  console.log("[loadOnnxModel] Waiting for ONNX environment to be ready...");
  await ort.env.ready;
  console.log("[loadOnnxModel] ONNX environment ready");

  // Configure execution providers
  const sessionOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
    enableCpuMemArena: true,
    enableMemPattern: true,
  };
  console.log("[loadOnnxModel] Session options configured:", sessionOptions);

  try {
    let uint8Array: Uint8Array | null = null;

    if (typeof self !== "undefined") {
      // Try to get from IndexedDB
      const cached = await get<Uint8Array>(url);
      if (cached) {
        console.log("[loadOnnxModel] Loaded model from IndexedDB cache");
        uint8Array = cached;
      }
    }

    if (!uint8Array) {
      console.log("[loadOnnxModel] Fetching model from URL...");
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch model from URL: ${response.statusText}`
        );
      }
      console.log("[loadOnnxModel] Model fetched successfully");

      const arrayBuffer = await response.arrayBuffer();
      uint8Array = new Uint8Array(arrayBuffer);
      console.log(
        "[loadOnnxModel] Model converted to Uint8Array, size:",
        uint8Array.length
      );

      // Store in IndexedDB for future loads (browser only)
      if (typeof self !== "undefined") {
        try {
          await set(url, uint8Array);
          console.log("[loadOnnxModel] Model cached in IndexedDB");
        } catch (cacheError) {
          console.warn(
            "[loadOnnxModel] Failed to cache model in IndexedDB:",
            cacheError
          );
        }
      }
    }

    // Create inference session with options
    console.log("[loadOnnxModel] Creating inference session...");
    const session = await ort.InferenceSession.create(
      uint8Array,
      sessionOptions
    );
    console.log("[loadOnnxModel] Inference session created successfully");

    return session;
  } catch (error) {
    console.error("[loadOnnxModel] Error:", error);
    throw error;
  }
};
