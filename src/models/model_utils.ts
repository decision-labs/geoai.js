import { PretrainedModelOptions } from "@huggingface/transformers";
import * as ort from "onnxruntime-web";

// Cross-platform cache utilities
const CACHE_DB_NAME = "onnx-model-cache";
const CACHE_DB_VERSION = 1;
const CACHE_STORE_NAME = "models";

interface CachedModel {
  url: string;
  data: Uint8Array;
  timestamp: number;
}

// Environment detection
const isBrowser =
  (typeof window !== "undefined" && typeof indexedDB !== "undefined") ||
  (typeof self !== "undefined" && typeof indexedDB !== "undefined"); // Web Worker support
const isNode =
  typeof process !== "undefined" && process.versions && process.versions.node;

// Conditional Node.js imports (only available in Node.js environment)
let crypto: any, fs: any, path: any, os: any;

if (isNode) {
  try {
    crypto = require("crypto");
    fs = require("fs");
    path = require("path");
    os = require("os");
  } catch (error) {
    console.warn("Failed to load Node.js modules:", error);
  }
}

// Node.js cache directory
export const getNodeCacheDir = (): string => {
  if (!isNode || !path || !os || !fs)
    throw new Error("Node.js modules not available");

  const cacheDir = path.join(os.homedir(), ".geobase-ai", "model-cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
};

// Generate cache key from URL
export const getCacheKey = (url: string): string => {
  if (isNode && crypto) {
    return crypto.createHash("md5").update(url).digest("hex");
  } else {
    // Fallback hash function for browser (simple but sufficient)
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
};

// Browser IndexedDB implementation
async function openCacheDB(): Promise<IDBDatabase> {
  if (!isBrowser) throw new Error("IndexedDB not available");

  // Use self.indexedDB in Web Workers, window.indexedDB in main thread
  const IDB =
    (typeof self !== "undefined" && self.indexedDB) ||
    (typeof window !== "undefined" && window.indexedDB) ||
    indexedDB;

  return new Promise((resolve, reject) => {
    const request = IDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        const store = db.createObjectStore(CACHE_STORE_NAME, {
          keyPath: "url",
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

async function getCachedModelBrowser(url: string): Promise<Uint8Array | null> {
  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], "readonly");
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.get(url);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as CachedModel | undefined;
        resolve(result ? result.data : null);
      };
    });
  } catch (error) {
    console.warn("[getCachedModelBrowser] Cache access failed:", error);
    return null;
  }
}

async function setCachedModelBrowser(
  url: string,
  data: Uint8Array
): Promise<void> {
  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], "readwrite");
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const cachedModel: CachedModel = {
        url,
        data,
        timestamp: Date.now(),
      };
      const request = store.put(cachedModel);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn("[setCachedModelBrowser] Cache storage failed:", error);
  }
}

// Node.js file system implementation
async function getCachedModelNode(url: string): Promise<Uint8Array | null> {
  try {
    const cacheDir = getNodeCacheDir();
    const cacheKey = getCacheKey(url);
    const cachePath = path.join(cacheDir, `${cacheKey}.bin`);
    const metaPath = path.join(cacheDir, `${cacheKey}.meta.json`);

    if (!fs.existsSync(cachePath) || !fs.existsSync(metaPath)) {
      return null;
    }

    // Read metadata to verify URL matches
    const metaData = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    if (metaData.url !== url) {
      return null;
    }

    // Read the cached model data
    const data = fs.readFileSync(cachePath);
    return new Uint8Array(data);
  } catch (error) {
    console.warn("[getCachedModelNode] Cache access failed:", error);
    return null;
  }
}

async function setCachedModelNode(
  url: string,
  data: Uint8Array
): Promise<void> {
  try {
    const cacheDir = getNodeCacheDir();
    const cacheKey = getCacheKey(url);
    const cachePath = path.join(cacheDir, `${cacheKey}.bin`);
    const metaPath = path.join(cacheDir, `${cacheKey}.meta.json`);

    // Write metadata
    const metaData = {
      url,
      timestamp: Date.now(),
      size: data.byteLength,
    };
    fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2));

    // Write model data
    fs.writeFileSync(cachePath, Buffer.from(data));
  } catch (error) {
    console.warn("[setCachedModelNode] Cache storage failed:", error);
  }
}

// Cross-platform cache interface
async function getCachedModel(url: string): Promise<Uint8Array | null> {
  if (isBrowser) {
    return getCachedModelBrowser(url);
  } else if (isNode) {
    return getCachedModelNode(url);
  } else {
    console.warn("[getCachedModel] Unknown environment, caching disabled");
    return null;
  }
}

async function setCachedModel(url: string, data: Uint8Array): Promise<void> {
  if (isBrowser) {
    return setCachedModelBrowser(url, data);
  } else if (isNode) {
    return setCachedModelNode(url, data);
  } else {
    console.warn("[setCachedModel] Unknown environment, caching disabled");
  }
}

async function fetchModelAsUint8Array(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch ONNX model");

  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  if (!reader) throw new Error("Unable to get reader from response body");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      totalLength += value.length;
    }
  }

  // Concatenate all chunks into a single Uint8Array
  const modelData = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    modelData.set(chunk, offset);
    offset += chunk.length;
  }

  return modelData;
}

const buildModelUrl = (
  modelId: string,
  modelParams: PretrainedModelOptions | undefined
): string => {
  const baseUrl = "https://huggingface.co";
  if (modelId.split("/").length !== 2) {
    throw new Error(
      'Model ID must be in the format "username/repository-name", e.g., "geobase/car-detection"'
    );
  }
  const revision = modelParams?.revision || "main";
  let modelFileName = modelParams?.model_file_name || "model";
  if (modelFileName.toLowerCase().endsWith(".onnx")) {
    modelFileName = modelFileName.slice(0, -5);
  }
  const subFolder =
    modelParams?.subfolder === undefined ? "onnx" : modelParams?.subfolder;

  let modelUrl;
  if (subFolder && subFolder.trim() !== "") {
    modelUrl = `${baseUrl}/${modelId}/resolve/${revision}/${subFolder}/${modelFileName}.onnx`;
  } else {
    modelUrl = `${baseUrl}/${modelId}/resolve/${revision}/${modelFileName}.onnx`;
  }
  return modelUrl;
};

export const loadOnnxModel = async (
  modelId: string,
  modelParams: PretrainedModelOptions | undefined
): Promise<ort.InferenceSession> => {
  const url = buildModelUrl(modelId, modelParams);
  console.log("[loadOnnxModel] Start loading model from:", url);

  // Set ONNX WASM paths for browser
  if (typeof self !== "undefined") {
    ort.env.wasm.wasmPaths =
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
  }

  // Wait for runtime environment
  await ort.env.ready;

  // Session options
  const sessionOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  };

  // Check local cache first
  let uint8Array: Uint8Array | null = null;

  uint8Array = await getCachedModel(url);

  if (uint8Array) {
    console.log(
      `[loadOnnxModel] Model found in cache, size: ${(uint8Array.byteLength / 1024 / 1024).toFixed(2)} MB`
    );
  } else {
    try {
      console.log("[loadOnnxModel] Model not in cache, downloading...");
      uint8Array = await fetchModelAsUint8Array(url);
      console.log(
        `[loadOnnxModel] Model downloaded, size: ${(uint8Array.byteLength / 1024 / 1024).toFixed(2)} MB`
      );

      // Cache the model for future use
      await setCachedModel(url, uint8Array);
      console.log("[loadOnnxModel] Model cached successfully");
    } catch (err) {
      console.error("[loadOnnxModel] Error downloading model:", err);
      throw err;
    }
  }

  // Load session
  const session = await ort.InferenceSession.create(uint8Array, sessionOptions);
  console.log("[loadOnnxModel] Model loaded successfully");

  return session;
};
