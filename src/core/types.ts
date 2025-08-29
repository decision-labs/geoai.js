import { PretrainedModelOptions } from "@huggingface/transformers";
import * as ort from "onnxruntime-web";
import { GeoRawImage } from "@/types/images/GeoRawImage";

// Model Types:
// ==============================
import { MaskGeneration, SegmentationInput } from "@/models/mask_generation";
import {
  BuildingDetection,
  CarDetection,
  ShipDetection,
  SolarPanelDetection,
  WetLandSegmentation,
} from "@/models/geoai_models";
import { CoconutTreeDetection } from "@/models/coconut_tree_detection";
import { LandCoverClassification } from "@/models/land_cover_classification";
import { ObjectDetection } from "@/models/object_detection";
import { OilStorageTankDetection } from "@/models/oil_storage_tank_detection";
import { OrientedObjectDetection } from "@/models/oriented_object_detection";
import { ZeroShotObjectDetection } from "@/models/zero_shot_object_detection";
import { BuildingFootPrintSegmentation } from "@/models/building_footprint_segmentation";
import { ImageFeatureExtraction } from "@/models/image_feature_extraction";
// NOTE: Add new models here
// ==============================

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

export type EsriParams = {
  provider: "esri";
  serviceUrl?: string;
  serviceName?: string;
  tileSize?: number;
  attribution?: string;
};

export interface InferenceInputs {
  polygon: GeoJSON.Feature;
  classLabel?: string;
  [key: string]: unknown;
}

export type PostProcessingParams = {
  [key: string]: unknown;
};

export interface MapSourceParams {
  zoomLevel?: number;
  bands?: number[];
  expression?: string;
}

export interface InferenceParams {
  inputs: InferenceInputs;
  postProcessingParams?: PostProcessingParams;
  mapSourceParams?: MapSourceParams;
}

export interface mapSourceConfig {
  zoomLevel?: number;
  [key: string]: unknown;
}

export type onnxModel = ort.InferenceSession;

export type ProviderParams =
  | MapboxParams
  | SentinelParams
  | GeobaseParams
  | EsriParams;

export type HuggingFaceModelTask =
  | "mask-generation"
  | "zero-shot-object-detection"
  | "zero-shot-image-classification"
  | "object-detection"
  | "oriented-object-detection"
  | "image-feature-extraction";

export type GeobaseAiModelTask =
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
  | "oil-storage-tank-detection"
  | "building-footprint-segmentation"
  | "coconut-tree-detection";

export type ModelInstance =
  | MaskGeneration
  | ZeroShotObjectDetection
  | ObjectDetection
  | OrientedObjectDetection
  | LandCoverClassification
  | SolarPanelDetection
  | ShipDetection
  | CarDetection
  | WetLandSegmentation
  | BuildingDetection
  | OilStorageTankDetection
  | BuildingFootPrintSegmentation
  | ImageFeatureExtraction
  | CoconutTreeDetection;

export type ModelConfig = {
  task: HuggingFaceModelTask | GeobaseAiModelTask;
  library: string;
  description: string;
  examples?: string[];
  geobase_ai_pipeline: (
    params: ProviderParams,
    modelId?: string,
    modelParams?: PretrainedModelOptions
  ) => Promise<{
    instance: ModelInstance;
  }>;
  chainableTasks?: string[];
  ioConfig?: {
    inputs: any;
    outputs: any;
  };
  defaultModelId?: string;
  modelParams?: PretrainedModelOptions;
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

export interface ObjectDetectionResults {
  detections: GeoJSON.FeatureCollection;
  geoRawImage: GeoRawImage;
}

export interface ImageFeatureExtractionResults {
  features: number[][]; // Patch-level feature vectors
  similarityMatrix: number[][]; // Patch-to-patch similarities
  patchSize: number; // Size of each patch (e.g., 16)
  geoRawImage: GeoRawImage; // Original image data
  metadata: {
    numPatches: number;
    featureDimensions: number;
    modelId: string;
  };
}

export type imageFeatureExtractionIOConfig = {
  inputs: {
    polygon: GeoJSON.Feature;
    similarityThreshold?: number;
    maxFeatures?: number;
  };
  outputs: ImageFeatureExtractionResults;
};
