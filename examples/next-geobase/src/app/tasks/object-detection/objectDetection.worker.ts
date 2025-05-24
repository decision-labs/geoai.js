import { geobaseAi } from "geobase-ai";

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
};

type InferencePayload = {
  polygon: GeoJSON.Feature;
  confidenceScore: number;
  zoomLevel: number;
};

let objectDetector: any = null;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case "init": {
        const { provider, modelId, ...config } = payload as InitPayload;
        
        const response = await geobaseAi.pipeline(
          "object-detection",
          {
            provider,
            ...config,
          },
          modelId
        );
        
        objectDetector = response.instance;
        self.postMessage({ type: "init_complete" });
        break;
      }
      
      case "inference": {
        if (!objectDetector) {
          throw new Error("Object detector not initialized");
        }

        const { polygon, confidenceScore, zoomLevel } = payload as InferencePayload;
        
        const result = await objectDetector.inference(polygon, confidenceScore, {
          zoomLevel,
        });

        self.postMessage({ 
          type: "inference_complete", 
          payload: result 
        });
        break;
      }
    }
  } catch (error) {
    self.postMessage({ 
      type: "error", 
      payload: error instanceof Error ? error.message : "Unknown error occurred" 
    });
  }
}; 