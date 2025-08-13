import { PretrainedModelOptions } from "@huggingface/transformers";
import {
  baseIOConfig,
  maskGenerationIOConfig,
  ModelConfig,
  ProviderParams,
  zeroShotModelIOConfig,
  ObjectDetectionResults,
} from "@/core/types";
import { ZeroShotObjectDetection } from "./models/zero_shot_object_detection";
import { MaskGeneration } from "./models/mask_generation";
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
import { BuildingFootPrintSegmentation } from "./models/building_footprint_segmentation";

export const modelRegistry: ModelConfig[] = [
  {
    task: "zero-shot-object-detection",
    library: "@huggingface/transformers",
    description: "Zero-shot object detection model.",
    chainableTasks: ["mask-generation"],
    ioConfig: {} as zeroShotModelIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "onnx-community/grounding-dino-tiny-ONNX",
      modelParams?: PretrainedModelOptions
    ): Promise<{
      instance: ZeroShotObjectDetection;
    }> => {
      return ZeroShotObjectDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "mask-generation",
    library: "@huggingface/transformers",
    description: "Mask generation model.",
    ioConfig: {} as maskGenerationIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "Xenova/slimsam-77-uniform",
      modelParams?: PretrainedModelOptions
    ): Promise<{
      instance: MaskGeneration;
    }> => {
      return MaskGeneration.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "object-detection",
    library: "@huggingface/transformers",
    description: "Object Detection model.",
    chainableTasks: ["mask-generation"],
    ioConfig: {} as baseIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/WALDO30-yolov8m-640x640",
      modelParams?: PretrainedModelOptions
    ): Promise<{
      instance: ObjectDetection;
    }> => {
      return ObjectDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "oriented-object-detection",
    library: "@huggingface/transformers",
    description: "Oriented Object Detection model.",
    ioConfig: {} as baseIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/gghl-oriented-object-detection",
      modelParams: PretrainedModelOptions = {
        dtype: "q8",
      }
    ): Promise<{
      instance: OrientedObjectDetection;
    }> => {
      return OrientedObjectDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "land-cover-classification",
    library: "@geobase-js/geoai",
    description: "Land Cover Classification model.",
    ioConfig: {} as {
      inputs: {
        polygon: GeoJSON.Feature;
        minArea?: number;
      };
      outputs: ObjectDetectionResults;
    },
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/sparsemask",
      modelParams: PretrainedModelOptions = {
        dtype: "fp32",
      }
    ): Promise<{
      instance: LandCoverClassification;
    }> => {
      return LandCoverClassification.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "solar-panel-detection",
    library: "@geobase-js/geoai",
    description: "Solar Panel Detection model.",
    ioConfig: {} as baseIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/geoai-models",
      modelParams: PretrainedModelOptions = {
        model_file_name: "solarPanelDetection",
        dtype: "q8",
      }
    ): Promise<{
      instance: SolarPanelDetection;
    }> => {
      return SolarPanelDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "ship-detection",
    library: "@geobase-js/geoai",
    description: "Ship Detection model.",
    ioConfig: {} as baseIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/geoai-models",
      modelParams: PretrainedModelOptions = {
        model_file_name: "shipDetection",
        dtype: "q8",
      }
    ): Promise<{
      instance: ShipDetection;
    }> => {
      return ShipDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "car-detection",
    library: "@geobase-js/geoai",
    description: "Car Detection model.",
    ioConfig: {} as baseIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/geoai-models",
      modelParams: PretrainedModelOptions = {
        model_file_name: "carDetectionUSA",
        dtype: "q8",
      }
    ): Promise<{
      instance: CarDetection;
    }> => {
      return CarDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "wetland-segmentation",
    library: "@geobase-js/geoai",
    description: "Wetland Segmentation model.",
    ioConfig: {} as baseIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/geoai-models",
      modelParams: PretrainedModelOptions = {
        model_file_name: "wetlandDetection",
        dtype: "q8",
      }
    ): Promise<{
      instance: WetLandSegmentation;
    }> => {
      return WetLandSegmentation.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "building-detection",
    library: "@geobase-js/geoai",
    description: "Building Detection model.",
    ioConfig: {} as baseIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/geoai-models",
      modelParams: PretrainedModelOptions = {
        model_file_name: "buildingDetection",
        dtype: "q8",
      }
    ): Promise<{
      instance: BuildingDetection;
    }> => {
      return BuildingDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "oil-storage-tank-detection",
    library: "@geobase-js/geoai",
    description: "Oil Storage Tank Detection Model.",
    ioConfig: {} as {
      inputs: {
        polygon: GeoJSON.Feature;
        confidenceThreshold?: number;
        nmsThreshold?: number;
      };
      outputs: ObjectDetectionResults;
    },
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/oil-storage-tank-detection",
      modelParams: PretrainedModelOptions = {
        dtype: "q8",
      }
    ): Promise<{
      instance: OilStorageTankDetection;
    }> => {
      return OilStorageTankDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "building-footprint-segmentation",
    library: "@geobase-js/geoai",
    description: "Building Footprint Segmentation Model.",
    ioConfig: {} as {
      inputs: {
        polygon: GeoJSON.Feature;
        confidenceThreshold?: number;
        minArea?: number;
      };
      outputs: ObjectDetectionResults;
    },
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/building-footprint-segmentation",
      modelParams?: PretrainedModelOptions
    ): Promise<{
      instance: BuildingFootPrintSegmentation;
    }> => {
      return BuildingFootPrintSegmentation.getInstance(
        modelId,
        params,
        modelParams
      );
    },
  },
];
