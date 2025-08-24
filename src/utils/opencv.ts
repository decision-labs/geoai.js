import cv from "@techstark/opencv-js";

let opencvReady = false;
let opencvPromise: Promise<void> | null = null;

// Check OpenCV version to determine initialization method
const getOpenCVVersion = (): string | null => {
  try {
    // Try to access version information
    if (cv.getBuildInformation) {
      const buildInfo = cv.getBuildInformation();
      // Extract version from build information
      const versionMatch = buildInfo.match(/OpenCV\s+(\d+\.\d+\.\d+)/);
      return versionMatch ? versionMatch[1] : null;
    }
  } catch (e) {
    // Version not available yet
  }
  return null;
};

// Future: Add support for OpenCV >=4.11
// const isOpenCVVersion411OrHigher = (): boolean => {
//   const version = getOpenCVVersion();
//   if (!version) return false;
//   const [major, minor] = version.split(".").map(Number);
//   return major > 4 || (major === 4 && minor >= 11);
// };

export const initializeOpenCV = (): Promise<void> => {
  // Use process.stdout.write for more reliable logging in Node.js
  const log = (message: string) => {
    console.log(message);
    if (typeof process !== "undefined" && process.stdout) {
      process.stdout.write(message + "\n");
    }
  };

  log("🔍 initializeOpenCV called");

  if (opencvReady) {
    log("✅ OpenCV already ready, returning immediately");
    return Promise.resolve();
  }

  if (opencvPromise) {
    log(
      "⏳ OpenCV initialization already in progress, returning existing promise"
    );
    return opencvPromise;
  }

  log("🚀 Starting OpenCV initialization...");
  opencvPromise = new Promise((resolve, reject) => {
    // Check if OpenCV is already initialized by checking if getBuildInformation is available
    log("🔍 Checking if OpenCV is already initialized...");
    log(`cv.getBuildInformation: ${typeof cv.getBuildInformation}`);
    log(`cv.onRuntimeInitialized: ${typeof cv.onRuntimeInitialized}`);

    if (
      cv.getBuildInformation &&
      typeof cv.getBuildInformation === "function"
    ) {
      // OpenCV is already loaded and ready
      opencvReady = true;
      const version = getOpenCVVersion();
      log(`✅ OpenCV.js already initialized. Version: ${version || "unknown"}`);
      resolve();
      return;
    }

    // For now, we're using the legacy pattern (<=4.10)
    // This can be extended to support >=4.11 in the future
    log("🔄 Initializing OpenCV.js using <=4.10 pattern...");

    cv.onRuntimeInitialized = () => {
      log("✅ OpenCV.js is ready!");
      const version = getOpenCVVersion();
      log(`📊 OpenCV version: ${version || "unknown"}`);
      log(`📋 Build information: ${cv.getBuildInformation()}`);
      opencvReady = true;
      resolve();
    };

    // Set a timeout in case OpenCV fails to load
    setTimeout(() => {
      if (!opencvReady) {
        log("❌ OpenCV.js initialization timeout");
        reject(new Error("OpenCV.js failed to initialize within timeout"));
      }
    }, 30000); // 30 second timeout
  });

  return opencvPromise;
};

export const getOpenCV = (): typeof cv => {
  if (!opencvReady) {
    throw new Error(
      "OpenCV.js is not initialized. Call initializeOpenCV() first."
    );
  }
  return cv;
};

export const isOpenCVReady = (): boolean => {
  return opencvReady;
};
