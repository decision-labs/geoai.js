 
import { geoai, InferenceParams } from "geoai";
import { PipelineInitConfig } from "./useGeoAIWorker";

// Worker message types
type WorkerMessage = {
  type: "init" | "inference" | "getEmbeddings";
  payload: any;
};

let modelInstance: any = null;
let initializedTasks: string[] = [];

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  console.log("[Worker] onmessage event:", e);
  const { type, payload } = e.data;

  try {
    switch (type) {
      case "init": {
        console.log("[Worker] Received init message");
        const { tasks, providerParams } = payload as PipelineInitConfig;

        console.log("[Worker] Init payload:", {
          tasks,
          providerParams,
        });

        console.log("[Worker] Starting pipeline initialization");

        // Debug: check geoai import
        try {
          console.log("[Worker] Attempting to import geoai...");
          if (!geoai) {
            throw new Error("geoai is not defined");
          }
        } catch (importErr) {
          console.error("[Worker] geoai import error:", importErr);
          throw importErr;
        }

        modelInstance = await geoai.pipeline(tasks, providerParams);
        initializedTasks = tasks.map(t => t.task);

        console.log("[Worker] Pipeline initialized successfully");
        self.postMessage({
          type: "init_complete",
          payload: { tasks: initializedTasks },
        });
        break;
      }

      case "inference": {
        console.log("[Worker] Received inference message");
        if (!modelInstance) {
          console.error("[Worker] Model instance not initialized");
          throw new Error("Object detector not initialized");
        }

        const { inputs, postProcessingParams, mapSourceParams } =
          payload as InferenceParams;
        console.log("[Worker] Running inference with:", {
          inputs,
          postProcessingParams,
          mapSourceParams,
        });

        console.log("[Worker] Starting inference");

        let result: any;
        try {
          result = await modelInstance.inference(payload as InferenceParams);
        } catch (inferErr) {
          console.error("[Worker] Inference error:", inferErr);
          throw inferErr;
        }
        console.log("[Worker] Inference completed successfully");
        console.log({ result });

        self.postMessage({
          type: "inference_complete",
          payload: result,
        });
        break;
      }

      case "getEmbeddings": {
        console.log("[Worker] Received getEmbeddings message");
        
        if (!modelInstance) {
          throw new Error("Model not initialized. Call 'init' first.");
        }

        // Check if the model has a getImageEmbeddings method
        if (typeof modelInstance.getImageEmbeddings !== 'function') {
          throw new Error("Model does not support getImageEmbeddings method");
        }

        const { inputs, postProcessingParams, mapSourceParams } =
          payload as InferenceParams;
        console.log("[Worker] Getting embeddings with:", {
          inputs,
          postProcessingParams,
          mapSourceParams,
        });
        
        let result: any;
        try {
          result = await modelInstance.getImageEmbeddings(payload as InferenceParams);
        } catch (embedErr) {
          console.error("[Worker] getImageEmbeddings error:", embedErr);
          throw embedErr;
        }
        console.log("Embeddings result:", result);

        // Convert tensors to serializable format
        const serializableResult = {
          ...result,
          image_embeddings: {
            ...result.image_embeddings,
            image_embeddings: {
              data: Array.from(result.image_embeddings.image_embeddings.data),
              dims: result.image_embeddings.image_embeddings.dims,
              type: result.image_embeddings.image_embeddings.type
            },
            image_positional_embeddings: {
              data: Array.from(result.image_embeddings.image_positional_embeddings.data),
              dims: result.image_embeddings.image_positional_embeddings.dims,
              type: result.image_embeddings.image_positional_embeddings.type
            }
          }
        };

        self.postMessage({
          type: "embeddings_complete",
          payload: serializableResult
        });
        break;
      }
    }
  } catch (error) {
    console.error("[Worker] Error occurred:", error);
    self.postMessage({
      type: "error",
      payload: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}; 