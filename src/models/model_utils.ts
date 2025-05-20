import { onnxModel } from "@/core/types";
import * as ort from "onnxruntime-web";

/**
 * Loads an ONNX model from the given URL using ONNX Runtime Web.
 * @param url The URL to fetch the ONNX model from.
 * @returns A Promise that resolves to an ONNX InferenceSession.
 */
export const loadOnnxModel = async (url: string): Promise<onnxModel> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch model from URL: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Load model using ONNX Runtime
  return await ort.InferenceSession.create(uint8Array);
};
