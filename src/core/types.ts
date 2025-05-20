import {
  GenericSegmentation,
  SegmentationInput,
} from "@/models/generic_segmentation";
import {
  BuildingDetection,
  CarDetection,
  ShipDetection,
  SolarPanelDetection,
  WetLandSegmentation,
} from "@/models/geoai_models";
import { LandCoverClassification } from "@/models/land_cover_classification";
import { ObjectDetection } from "@/models/object_detection";
import { OilStorageTankDetection } from "@/models/oil_storage_tank_detection";
import { OrientedObjectDetection } from "@/models/oriented_object_detection";
import {
  ObjectDetectionResults,
  ZeroShotObjectDetection,
} from "@/models/zero_shot_object_detection";
import { PretrainedOptions } from "@huggingface/transformers";
import * as ort from "onnxruntime-web";
import { GeoRawImage } from "@/types/images/GeoRawImage";

export type MapboxParams = {
  provider: "mapbox";
  apiKey: string;
  style: string;
};

export type SentinelParams = {
  provider: "sentinel";
  apiKey: string;
};

export type GeobaseParams = {
  provider: "geobase";
  apikey: string;
  cogImagery: string;
  projectRef: string;
};

export type mapSourceConfig = {
  zoomLevel?: number;
  bands?: number[];
  expression?: string;
};

export type onnxModel = ort.InferenceSession;

export type ProviderParams = MapboxParams | SentinelParams | GeobaseParams;

export type HuggingFaceModelTasks =
  | "mask-generation"
  | "zero-shot-object-detection"
  | "zero-shot-image-classification"
  | "object-detection"
  | "oriented-object-detection";

export type GeobaseAiModelTasks =
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

export type ModelsInstances =
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

export type ModelConfig = {
  task: HuggingFaceModelTasks | GeobaseAiModelTasks;
  library: string;
  description: string;
  geobase_ai_pipeline: (
    params: ProviderParams,
    modelId?: string,
    modelParams?: PretrainedOptions
  ) => Promise<{
    instance: ModelsInstances;
  }>;
  chainableTasks?: string[];
  ioConfig?: {
    inputs: any;
    outputs: any;
  };
  defaultModelId?: string;
  modelParams?: PretrainedOptions;
};

export type zeroShotModelIOConfig = {
  inputs: {
    polygon: GeoJSON.Feature;
    text: string;
    options?: any;
  };
  outputs: ObjectDetectionResults;
};

export interface SegmentationResults {
  detections: GeoJSON.FeatureCollection;
  masks: GeoJSON.FeatureCollection;
  geoRawImage: GeoRawImage;
  rawDetections: any[];
}

export type maskGenerationIOConfig = {
  inputs: {
    polygon: GeoJSON.Feature;
    input: SegmentationInput;
    maxMasks?: number;
  };
  outputs: SegmentationResults;
};

export type baseIOConfig = {
  inputs: {
    polygon: GeoJSON.Feature;
    options?: any;
  };
  outputs: ObjectDetectionResults;
};
