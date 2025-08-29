import { PretrainedModelOptions } from "@huggingface/transformers";
import {
  baseIOConfig,
  maskGenerationIOConfig,
  ModelConfig,
  ProviderParams,
  zeroShotModelIOConfig,
  ObjectDetectionResults,
  imageFeatureExtractionIOConfig,
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
import { CoconutTreeDetection } from "./models/coconut_tree_detection";
import { OilStorageTankDetection } from "./models/oil_storage_tank_detection";
import { BuildingFootPrintSegmentation } from "./models/building_footprint_segmentation";
import { ImageFeatureExtraction } from "./models/image_feature_extraction";

export const modelRegistry: ModelConfig[] = [
  {
    task: "zero-shot-object-detection",
    library: "@huggingface/transformers",
    description:
      "This model can detect objects given a label. If a label falls outside of the categories that a more specialised model can handle, this model should be used. Prefer not to use this model if the label is a specific object that is one of the ones from this list: LightVehicle, Person, Building, Utility Pole, Boat, Bike, Container, Truck, Gastank, Digger, SolarPanels, Bus.",
    examples: [
      "Find all aircraft in this satellite image.",
      "Locate wind turbines in this region.",
      "Identify train stations along this railway.",
      "Detect oil rigs in this offshore area.",
      "Find helipads on rooftops.",
    ],
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
    description:
      "Useful when user wants to find things that are best represented as contiguous areas like roads, farms, car-parks, lakes, arrays of solar panels or even mountain ranges. Not useful for finding individual items.",
    examples: [
      "Segment all forests in this region.",
      "Identify all lakes in this satellite image.",
      "Detect all agricultural fields in this farmland.",
      "Locate urban parks in this cityscape.",
    ],
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
    description:
      "This model is trained to detect objects belonging to these classes: LightVehicle, Person, Building, Utility Pole, Boat, Bike, Container, Truck, Gastank, Digger, SolarPanels, Bus. It should be used for finding individual items in a drone or satellite image that fall into these categories. It should not be used for detecting areas or regions for example: a field, a forest or a body of water.",
    examples: [
      "Detect all trucks in this urban area.",
      "Find cars and motorcycles in this highway image.",
      "Identify buildings in this industrial zone.",
      "Locate all boats in this coastal image.",
      "Spot utility poles in this rural road image.",
    ],
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
    description:
      "Detects objects with orientation (rotated bounding boxes) in satellite or aerial imagery. Useful for scenarios where objects are not axis-aligned, such as ships, airplanes, or vehicles in arbitrary directions.",
    examples: [
      "Detect oriented objects in this industrial area.",
      "Find rotated bounding boxes for vehicles in this image.",
      "Identify ships with their orientation in this port.",
      "Detect airplanes on a runway regardless of direction.",
    ],
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
    library: "geoai",
    description:
      "Classifies land cover types in a given region. Useful for mapping vegetation, urban areas, water, and other land use categories.",
    examples: [
      "Categorize this area by land use.",
      "What are the green areas on this map?",
      "Find residential and commercial zones.",
      "Identify agricultural fields and forests.",
    ],
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
    library: "geoai",
    description:
      "Detects and locates solar panels in satellite or aerial imagery. Useful for identifying solar farms, rooftop solar installations, or tracking renewable energy infrastructure.",
    examples: [
      "Find all solar panels in this industrial area.",
      "Locate solar farms in this desert region.",
      "Identify rooftop solar installations in this city.",
    ],
    ioConfig: {} as baseIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/solar-panel-detection",
      modelParams: PretrainedModelOptions = {
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
    library: "geoai",
    description:
      "Detects ships and large boats in maritime or coastal satellite imagery. Useful for monitoring shipping lanes, ports, or maritime activity.",
    examples: [
      "Detect all ships in this harbor.",
      "Find boats in this coastal image.",
      "Identify vessels in open water.",
    ],
    ioConfig: {} as baseIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/ship-detection",
      modelParams: PretrainedModelOptions = {
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
    library: "geoai",
    description:
      "Detects cars and other small vehicles in urban, suburban, or rural imagery. Useful for traffic analysis, parking lot monitoring, or urban planning.",
    examples: [
      "Find all cars in this parking lot.",
      "Detect vehicles on this highway.",
      "Identify cars in this city block.",
    ],
    ioConfig: {} as baseIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/car-detection",
      modelParams: PretrainedModelOptions = {
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
    library: "geoai",
    description:
      "Segments and identifies wetland areas in satellite imagery. Useful for environmental monitoring, conservation, and land use planning.",
    examples: [
      "Segment all wetlands in this region.",
      "Identify marsh areas in this satellite image.",
      "Find wetland zones near this river.",
      "Find water bodies",
    ],
    ioConfig: {} as baseIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/wetland-segmentation",
      modelParams: PretrainedModelOptions = {
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
    library: "geoai",
    description:
      "Detects buildings and built structures in satellite or aerial imagery. Useful for urban development, disaster response, or infrastructure mapping.",
    examples: [
      "Detect all buildings in this urban area.",
      "Find houses in this rural region.",
      "Identify structures in this industrial zone.",
    ],
    ioConfig: {} as baseIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/building-detection",
      modelParams: PretrainedModelOptions = {
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
    library: "geoai",
    description:
      "Detects oil storage tanks in industrial or port areas. Useful for monitoring energy infrastructure, compliance, or risk assessment.",
    examples: [
      "Find all oil storage tanks in this refinery.",
      "Detect tanks in this port facility.",
      "Identify oil tanks in this industrial area.",
    ],
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
    library: "geoai",
    description:
      "Segments the precise outlines (footprints) of buildings in imagery. Useful for mapping, urban planning, or disaster assessment.",
    examples: [
      "Segment building footprints in this city block.",
      "Identify the outlines of all buildings in this image.",
      "Find building perimeters in this urban area.",
    ],
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
  {
    task: "coconut-tree-detection",
    library: "geoai",
    description:
      "Detects coconut trees in high-resolution aerial imagery. Optimized for agricultural monitoring, plantation management, and environmental assessment. Uses YOLOv11n architecture for fast inference.",
    examples: [
      "Find all coconut trees in this plantation area.",
      "Detect coconut palms in this coastal region.",
      "Count coconut trees in this agricultural zone.",
      "Identify coconut trees for inventory purposes.",
      "Monitor coconut tree density in this farm.",
    ],
    ioConfig: {} as baseIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "geobase/coconut-detection-v1-yolov11n",
      modelParams: PretrainedModelOptions = {
        model_file_name: "model",
      }
    ): Promise<{
      instance: CoconutTreeDetection;
    }> => {
      return CoconutTreeDetection.getInstance(modelId, params, modelParams);
    },
  },
  {
    task: "image-feature-extraction",
    library: "@huggingface/transformers",
    description:
      "Extracts dense feature representations from satellite or aerial imagery using DINOv3. Useful for visual similarity analysis, feature-based image search, and semantic feature exploration. Provides patch-level features and similarity matrices for advanced image understanding.",
    examples: [
      "Extract visual features from this satellite image for similarity analysis.",
      "Find regions with similar visual characteristics in this aerial photo.",
      "Analyze the feature patterns in this urban area.",
      "Extract semantic features for content-aware image processing.",
      "Generate feature vectors for machine learning applications.",
    ],
    chainableTasks: ["object-detection", "mask-generation"],
    ioConfig: {} as imageFeatureExtractionIOConfig,
    geobase_ai_pipeline: (
      params: ProviderParams,
      modelId: string = "onnx-community/dinov3-vits16-pretrain-lvd1689m-ONNX",
      modelParams: PretrainedModelOptions = {
        dtype: "q8",
      }
    ): Promise<{
      instance: ImageFeatureExtraction;
    }> => {
      return ImageFeatureExtraction.getInstance(modelId, params, modelParams);
    },
  },
];
