import { geobaseAi, ProviderParams } from "geobase-ai";
import { PretrainedOptions } from "@huggingface/transformers";

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
            modelId
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

        const { polygon, zoomLevel, topk, confidenceScore,minArea, nmsThreshold, classLabel, inputPoint, maxMasks } = payload as InferencePayload;
        console.log("[Worker] Running inference with:", { zoomLevel, polygon, topk, confidenceScore, classLabel ,  inputPoint, maxMasks});

        console.log("[Worker] Starting inference");

        let result: any;
        if (payload.task === "zero-shot-object-detection") {
          result = await modelInstance.inference({
            inputs : {
              polygon,
              classLabel
            },
            post_processing_parameters : {
              threshold: confidenceScore,
              topk,
            },
            map_source_parameters : {
              zoomLevel
            }
          });
        } else if (payload.task === "oil-storage-tank-detection") {
          result = await modelInstance.inference({
            inputs : {
              polygon
            },
            post_processing_parameters : {
              confidenceThreshold: confidenceScore,
              nmsThreshold,
            },
            map_source_parameters : {
              zoomLevel
            }
          });
        } else if (payload.task === "land-cover-classification") {
        
            result = await modelInstance.inference({
              inputs : {
                polygon
              },
              post_processing_parameters : {
                minArea,
              },
              map_source_parameters : {
                zoomLevel
              }
            });
          
        } else if (payload.task === "oriented-object-detection") {
          result = await modelInstance.inference({
              inputs : {
                polygon
              },
              map_source_parameters : {
                zoomLevel
              }
            });
        } else if (payload.task === "wetland-detection") {
          
          result = await modelInstance.inference({
            inputs : {
              polygon
            },
            map_source_parameters : {
              zoomLevel
            }
          });
      
        } else if (payload.task === "object-detection") {
          result = await modelInstance.inference({
            inputs : {
              polygon
            },
            post_processing_parameters : {
              confidence : confidenceScore
            },
            map_source_parameters : {
              zoomLevel
            }
          }); 
        } else if (payload.task === "building-footprint-segmentation") {
          result = await modelInstance.inference({
            inputs : {
              polygon
            },
            post_processing_parameters : {
              confidenceThreshold : confidenceScore,
              minArea
            },
            map_source_parameters : {
              zoomLevel
            }
          }); 
        } else if (payload.task === "mask-generation") {
          result = await modelInstance.inference({
            inputs : {
              polygon,
              input : inputPoint
            },
            post_processing_parameters : {
              maxMasks
            },
            map_source_parameters : {
              zoomLevel
            }
          }); 
        } else {
            result = await modelInstance.inference({
              inputs : {
                polygon,
                classLabel,
                input : inputPoint
              },
              post_processing_parameters : {
                confidence: confidenceScore,
                topk,
                minArea,
              },
              map_source_parameters : {
                zoomLevel
              }
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