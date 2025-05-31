import { geobaseAi } from "geobase-ai";

// This worker was originally created for GeoAI models - but will refactor it to be more generic

// Worker message types
type WorkerMessage = {
  type: "init" | "inference";
  payload: any;
};

type InitPayload = {
  provider: "geobase" | "mapbox";
  projectRef?: string;
  apikey?: string;
  cogImagery?: string;
  apiKey?: string;
  style?: string;
  modelId: string;
  task: "object-detection" | "land-cover-classification" | "zero-shot-object-detection";
};

type InferencePayload = {
  polygon: GeoJSON.Feature;
  classLabel?: string;
  confidenceScore: number;
  zoomLevel: number;
  topk: number;
};

let modelInstance: any = null;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case "init": {
        console.log("[Worker] Received init message");
        const { task, provider, modelId, ...config } = payload as InitPayload;

        console.log("[Worker] Init payload:", { task, provider, modelId, config });

        console.log("[Worker] Starting pipeline initialization");
        const response = await geobaseAi.pipeline(
          task,
          {
            provider,
            ...config,
          },
          //   modelId
        );

        modelInstance = response.instance;
        console.log("[Worker] Pipeline initialized successfully");
        self.postMessage({ type: "init_complete" });
        break;
      }

      case "inference": {
        console.log("[Worker] Received inference message");
        if (!modelInstance) {
          console.error("[Worker] Model instance not initialized");
          throw new Error("Object detector not initialized");
        }

        const { polygon, zoomLevel, topk, confidenceScore, classLabel } = payload as InferencePayload;
        console.log("[Worker] Running inference with:", { zoomLevel, polygon, topk, confidenceScore, classLabel });

        console.log("[Worker] Starting inference");

        let result: any;
        if (payload.task === "zero-shot-object-detection") {
          result = await modelInstance.inference(polygon, classLabel, {
            threshold: confidenceScore,
            topk,
          }, {
            zoomLevel,
          });
        } else {
          result = await modelInstance.inference(polygon, {
            zoomLevel,
          });
        }
        console.log("[Worker] Inference completed successfully");
        console.log({ result });

        self.postMessage({
          type: "inference_complete",
          payload: result
        });
        break;
      }
    }
  } catch (error) {
    console.error("[Worker] Error occurred:", error);
    self.postMessage({
      type: "error",
      payload: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
}; 