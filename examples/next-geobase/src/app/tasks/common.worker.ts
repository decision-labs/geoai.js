import { geobaseAi, ProviderParams } from "geobase-ai";
import { PretrainedOptions } from "@huggingface/transformers";

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
  modelId?: string;
  task?: string;
  chain_config?: {
    task: string;
    modelId?: string;
    modelParams?: PretrainedOptions;
  }[];
};

type InferencePayload = {
  polygon: GeoJSON.Feature;
  classLabel?: string;
  confidenceScore: number;
  zoomLevel: number;
  topk: number;
  nmsThreshold?: number;
  minArea?: number;
  inputPoint?: any;
  maxMasks?: number;
  task: string;
};

let modelInstance: any = null;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case "init": {
        console.log("[Worker] Received init message");
        const { task, provider, modelId, chain_config, ...config } = payload as InitPayload;

        console.log("[Worker] Init payload:", { task, provider, modelId, config });

        console.log("[Worker] Starting pipeline initialization");
        let response;
        if (chain_config) {
          response = await geobaseAi.pipeline(
            chain_config as { task: string; modelId?: string; modelParams?: PretrainedOptions }[],
            { provider, ...config } as ProviderParams
          );
          modelInstance = response;
        }
        else {
          response = await geobaseAi.pipeline(
            task!,
            { provider, ...config } as ProviderParams,
          );
          modelInstance = response.instance;
        }

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

        const { polygon, zoomLevel, topk, confidenceScore, minArea, nmsThreshold, classLabel, inputPoint, maxMasks } = payload as InferencePayload;
        console.log("[Worker] Running inference with:", { zoomLevel, polygon, topk, confidenceScore, classLabel, inputPoint, maxMasks });

        console.log("[Worker] Starting inference");

        // Lookup table for argument builders by task name
        const inferenceArgBuilders: Record<string, (payload: InferencePayload) => any> = {
          "zero-shot-object-detection": (payload) => ({
            inputs: {
              polygon: payload.polygon,
              classLabel: payload.classLabel
            },
            post_processing_parameters: {
              threshold: payload.confidenceScore,
              topk: payload.topk,
            },
            map_source_parameters: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "oil-storage-tank-detection": (payload) => ({
            inputs: {
              polygon: payload.polygon
            },
            post_processing_parameters: {
              confidenceThreshold: payload.confidenceScore,
              nmsThreshold: payload.nmsThreshold,
            },
            map_source_parameters: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "land-cover-classification": (payload) => ({
            inputs: {
              polygon: payload.polygon
            },
            post_processing_parameters: {
              minArea: payload.minArea,
            },
            map_source_parameters: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "oriented-object-detection": (payload) => ({
            inputs: {
              polygon: payload.polygon
            },
            map_source_parameters: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "wetland-segmentation": (payload) => ({
            inputs: {
              polygon: payload.polygon
            },
            map_source_parameters: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "object-detection": (payload) => ({
            inputs: {
              polygon: payload.polygon
            },
            post_processing_parameters: {
              confidence: payload.confidenceScore
            },
            map_source_parameters: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "building-footprint-segmentation": (payload) => ({
            inputs: {
              polygon: payload.polygon
            },
            post_processing_parameters: {
              confidenceThreshold: payload.confidenceScore,
              minArea: payload.minArea
            },
            map_source_parameters: {
              zoomLevel: payload.zoomLevel
            }
          }),
          "mask-generation": (payload) => ({
            inputs: {
              polygon: payload.polygon,
              input: payload.inputPoint
            },
            post_processing_parameters: {
              maxMasks: payload.maxMasks
            },
            map_source_parameters: {
              zoomLevel: payload.zoomLevel
            }
          })
        };

        // Default builder if task is not found
        const defaultBuilder = (payload: InferencePayload) => ({
          inputs: {
            polygon: payload.polygon,
            classLabel: payload.classLabel,
            input: payload.inputPoint
          },
          post_processing_parameters: {
            confidence: payload.confidenceScore,
            topk: payload.topk,
            minArea: payload.minArea,
          },
          map_source_parameters: {
            zoomLevel: payload.zoomLevel
          }
        });

        const task = payload.task;
        const argBuilder = (task && inferenceArgBuilders[task]) ? inferenceArgBuilders[task] : defaultBuilder;
        const inferenceArgs = argBuilder(payload);
        let result: any;
        result = await modelInstance.inference(inferenceArgs);
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