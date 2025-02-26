// TODO models to incorporate
// https://huggingface.co/models?other=zero-shot-object-detection&library=transformers.js
// https://huggingface.co/models?pipeline_tag=zero-shot-image-classification&library=transformers.js

import { GenericSegmentation } from "./models/generic_segmentation";
import { ObjectDetection } from "./models/object_detection";
import { ZeroShotObjectDetection } from "./models/zero_shot_object_detection";
import { PretrainedOptions } from "@huggingface/transformers";

type MapboxParams = {
  provider: "mapbox";
  apiKey: string;
  style: string;
};

type SentinelParams = {
  provider: "sentinel";
  apiKey: string;
};

// Union type of all possible provider params
type ProviderParams = MapboxParams | SentinelParams;

type HuggingFaceModelTasks =
  | "mask-generation"
  | "zero-shot-object-detection"
  | "zero-shot-image-classification"
  | "object-detection";

type GeobaseAiModelTasks =
  | "damage-assessment"
  | "vegetation-classification"
  | "land-cover-classification"
  | "land-use-classification"
  | "land-cover-change-detection"
  | "land-use-change-detection";

type GeobaseAiModelMetadata = {
  task: HuggingFaceModelTasks | GeobaseAiModelTasks;
  library: string;
  model: string;
  description: string;
  geobase_ai_pipeline: (
    params: ProviderParams,
    modelId?: string,
    modelParams?: PretrainedOptions
  ) => Promise<{
    instance: GenericSegmentation | ZeroShotObjectDetection | ObjectDetection;
  }>;
};

const model_metadata: GeobaseAiModelMetadata[] = [
  {
    task: "zero-shot-object-detection",
    library: "transformers.js",
    model: "onnx-community/grounding-dino-tiny-ONNX",
    description: "Zero-shot object detection model.",
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "onnx-community/grounding-dino-tiny-ONNX",
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: ZeroShotObjectDetection;
    }> => {
      return ZeroShotObjectDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "mask-generation",
    library: "transformers.js",
    model: "Xenova/slimsam-77-uniform",
    description: "Mask generation model.",
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "Xenova/slimsam-77-uniform",
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: GenericSegmentation;
    }> => {
      return GenericSegmentation.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "object-detection",
    library: "transformers.js",
    model: "geobase/WALDO30_yolov8m_640x640",
    description: "Object Detection model.",
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/WALDO30_yolov8m_640x640",
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: ObjectDetection;
    }> => {
      return ObjectDetection.getInstance(modelId, params, modelParams);
    },
  },
];

const models = () => {
  return model_metadata;
};

const tasks = () => {
  return model_metadata.map(model => model.task);
};

const domains = () => {
  return ["geospatial", "computer-vision", "remote-sensing"];
};

const pipeline = async (
  task: HuggingFaceModelTasks | GeobaseAiModelTasks,
  params: ProviderParams,
  model_id?: string,
  modelParams?: any
) => {
  const model = model_metadata.find(model => model.task === task);

  if (!model) {
    throw new Error(`Model for task ${task} not found`);
  }

  return model.geobase_ai_pipeline(params, model_id, modelParams);
};

const geobaseAi = {
  tasks,
  domains,
  models,
  pipeline,
};

export {
  geobaseAi,
  type ProviderParams,
  type MapboxParams,
  type SentinelParams,
};
