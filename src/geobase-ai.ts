// TODO models to incorporate
// https://huggingface.co/models?other=zero-shot-object-detection&library=transformers.js
// https://huggingface.co/models?pipeline_tag=zero-shot-image-classification&library=transformers.js

import { GenericSegmentation } from "./models/generic_segmentation";
import {
  SolarPanelDetection,
  ShipDetection,
  CarDetection,
  WetLandSegmentation,
  BuildingDetection,
} from "./models/geoai_models";
import { LandCoverClassification } from "./models/land_cover_classification";
import { ObjectDetection } from "./models/object_detection";
import { OilStorageTankDetection } from "./models/oil_storage_tank_detection";
import { OrientedObjectDetection } from "./models/oriented_object_detection";
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

type GeobaseParams = {
  provider: "geobase";
  apikey: string;
  cogImagery: string;
  projectRef: string;
};

// Union type of all possible provider params
type ProviderParams = MapboxParams | SentinelParams | GeobaseParams;

type HuggingFaceModelTasks =
  | "mask-generation"
  | "zero-shot-object-detection"
  | "zero-shot-image-classification"
  | "object-detection"
  | "oriented-object-detection";

type GeobaseAiModelTasks =
  | "damage-assessment"
  | "vegetation-classification"
  | "land-cover-classification"
  | "land-use-classification"
  | "land-cover-change-detection"
  | "land-use-change-detection"
  | "solar-panel-detection"
  | "ship-detection"
  | "car-detection"
  | "wetland-segmentation"
  | "building-detection"
  | "oil-storage-tank-detection";

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
    instance:
      | GenericSegmentation
      | ZeroShotObjectDetection
      | ObjectDetection
      | OrientedObjectDetection
      | LandCoverClassification
      | SolarPanelDetection
      | ShipDetection
      | CarDetection
      | WetLandSegmentation
      | BuildingDetection
      | OilStorageTankDetection;
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
  {
    task: "oriented-object-detection",
    library: "transformers.js",
    model: "geobase/gghl-oriented-object-detection",
    description: "Oriented Object Detection model.",
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "https://huggingface.co/geobase/gghl-oriented-object-detection/resolve/main/onnx/model_quantized.onnx",
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: OrientedObjectDetection;
    }> => {
      return OrientedObjectDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "land-cover-classification",
    library: "geobase-ai",
    model:
      "https://huggingface.co/geobase/sparsemask/resolve/main/onnx/sparsemask_model.onnx",
    description: "Land Cover Classification model.",
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "https://huggingface.co/geobase/sparsemask/resolve/main/onnx/sparsemask_model.onnx",
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: LandCoverClassification;
    }> => {
      return LandCoverClassification.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "solar-panel-detection",
    library: "geobase-ai",
    model:
      "https://huggingface.co/geobase/geoai_models/resolve/main/solarPanelDetection_quantized.onnx",
    description: "Land Cover Classification model.",
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "https://huggingface.co/geobase/geoai_models/resolve/main/solarPanelDetection_quantized.onnx",
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: SolarPanelDetection;
    }> => {
      return SolarPanelDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "ship-detection",
    library: "geobase-ai",
    model:
      "https://huggingface.co/geobase/geoai_models/resolve/main/shipDetection_quantized.onnx",
    description: "Land Cover Classification model.",
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "https://huggingface.co/geobase/geoai_models/resolve/main/shipDetection_quantized.onnx",
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: ShipDetection;
    }> => {
      return ShipDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "car-detection",
    library: "geobase-ai",
    model:
      "https://huggingface.co/geobase/geoai_models/resolve/main/carDetectionUSA_quantized.onnx",
    description: "Land Cover Classification model.",
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "https://huggingface.co/geobase/geoai_models/resolve/main/carDetectionUSA_quantized.onnx",
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: CarDetection;
    }> => {
      return CarDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "wetland-segmentation",
    library: "geobase-ai",
    model:
      "https://huggingface.co/geobase/geoai_models/resolve/main/wetland_detection_quantized.onnx",
    description: "Land Cover Classification model.",
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "https://huggingface.co/geobase/geoai_models/resolve/main/wetland_detection_quantized.onnx",
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: WetLandSegmentation;
    }> => {
      return WetLandSegmentation.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "building-detection",
    library: "geobase-ai",
    model:
      "https://huggingface.co/geobase/geoai_models/resolve/main/buildingDetection_quantized.onnx",
    description: "Land Cover Classification model.",
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "https://huggingface.co/geobase/geoai_models/resolve/main/buildingDetection_quantized.onnx",
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: BuildingDetection;
    }> => {
      return BuildingDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "oil-storage-tank-detection",
    library: "geobase-ai",
    model:
      "https://huggingface.co/geobase/oil-storage-tank-detection/resolve/main/oil_storage_tank_yolox_quantized.onnx",
    description: "Oil Storage Tank Detection Model.",
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "https://huggingface.co/geobase/oil-storage-tank-detection/resolve/main/oil_storage_tank_yolox_quantized.onnx",
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: OilStorageTankDetection;
    }> => {
      return OilStorageTankDetection.getInstance(modelId, params, modelParams);
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
