import { PretrainedOptions } from "@huggingface/transformers";
import { ModelConfig, ProviderParams } from "./core/types";
import { ZeroShotObjectDetection } from "./models/zero_shot_object_detection";
import { GenericSegmentation } from "./models/generic_segmentation";
import { ObjectDetection } from "./models/object_detection";
import { OrientedObjectDetection } from "./models/oriented_object_detection";
import { LandCoverClassification } from "./models/land_cover_classification";
import {
  BuildingDetection,
  CarDetection,
  ShipDetection,
  SolarPanelDetection,
  WetLandSegmentation,
} from "./models/geoai_models";
import { OilStorageTankDetection } from "./models/oil_storage_tank_detection";
import { ZeroShotObjectSegmentation } from "./models/zero_shot_object_segmentation";

export const modelRegistry: ModelConfig[] = [
  {
    task: "zero-shot-object-detection",
    library: "transformers.js",
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
  {
    task: "zero-shot-object-segmentation",
    library: "geobase-ai",
    description: "Zero shot object segmentation Model.",
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId?: string,
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: ZeroShotObjectSegmentation;
    }> => {
      return ZeroShotObjectSegmentation.getInstance(
        params,
        modelParams,
        modelId
      );
    },
  },
];
