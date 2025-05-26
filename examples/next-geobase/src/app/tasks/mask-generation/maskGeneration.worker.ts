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
  maxMasks: number;
  zoomLevel: number;
  input: {
    type: "boxes" | "points";
    coordinates: number[];
  }
};

let maskGenerator: any = null;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case "init": {
        const { provider, modelId, ...config } = payload as InitPayload;
        
        const response = await geobaseAi.pipeline(
          "mask-generation",
          {
            provider,
            ...config,
          },
          modelId
        );
        
        maskGenerator = response.instance;
        self.postMessage({ type: "init_complete" });
        break;
      }
      
      case "inference": {
        if (!maskGenerator) {
          throw new Error("Object detector not initialized");
        }

        const { polygon, input,maxMasks, zoomLevel } = payload as InferencePayload;
        if (!polygon || !input ) {
          throw new Error("Invalid input data for inference");
        }
        
        const result = await maskGenerator.inference(polygon, input, maxMasks, {
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