import { PretrainedOptions } from "@huggingface/transformers";
import {
  baseIOConfig,
  maskGenerationIOConfig,
  ModelConfig,
  ProviderParams,
  zeroShotModelIOConfig,
  ObjectDetectionResults,
} from "@/core/types";
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
      modelParams?: PretrainedOptions
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
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: GenericSegmentation;
    }> => {
      return GenericSegmentation.getInstance(modelId, params, modelParams);
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
    library: "@huggingface/transformers",
    description: "Oriented Object Detection model.",
    ioConfig: {} as baseIOConfig,
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
    library: "@geobase/geoai",
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
    library: "@geobase/geoai",
    description: "Land Cover Classification model.",
    ioConfig: {} as baseIOConfig,
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
    library: "@geobase/geoai",
    description: "Land Cover Classification model.",
    ioConfig: {} as baseIOConfig,
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
    library: "@geobase/geoai",
    description: "Land Cover Classification model.",
    ioConfig: {} as baseIOConfig,
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
    library: "@geobase/geoai",
    description: "Land Cover Classification model.",
    ioConfig: {} as baseIOConfig,
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
    library: "@geobase/geoai",
    description: "Land Cover Classification model.",
    ioConfig: {} as baseIOConfig,
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
    library: "@geobase/geoai",
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
      modelId: string = "https://huggingface.co/geobase/oil-storage-tank-detection/resolve/main/oil_storage_tank_yolox_quantized.onnx",
      modelParams?: PretrainedOptions
    ): Promise<{
      instance: OilStorageTankDetection;
    }> => {
      return OilStorageTankDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "building-footprint-segmentation",
    library: "@geobase/geoai",
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
      modelId: string = "https://huggingface.co/geobase/building_footprint_segmentation/resolve/main/model.onnx",
      modelParams?: PretrainedOptions
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
