import { Mapbox } from "@/data_providers/mapbox";
import {
  AutoModel,
  AutoProcessor,
  Processor,
  RawImage,
  YolosForObjectDetection,
  PretrainedConfig,
} from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";

import { ObjectDetectionResults } from "../models/zero_shot_object_detection";
import { postProcessYoloOutput } from "@/utils/utils";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
export class ObjectDetection {
  private static instance: ObjectDetection | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | undefined;
  private model_id: string;
  private model: YolosForObjectDetection | undefined;
  private processor: Processor | undefined;

  private initialized: boolean = false;

  private constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedConfig
  ) {
    this.model_id = model_id;
    this.providerParams = providerParams;
    this.modelParams = modelParams;
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedConfig
  ): Promise<{ instance: ObjectDetection }> {
    if (
      !ObjectDetection.instance ||
      parametersChanged(
        ObjectDetection.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      ObjectDetection.instance = new ObjectDetection(
        model_id,
        providerParams,
        modelParams
      );
      await ObjectDetection.instance.initialize();
    }
    return { instance: ObjectDetection.instance };
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize data provider first
    switch (this.providerParams.provider) {
      case "mapbox":
        this.dataProvider = new Mapbox(
          this.providerParams.apiKey,
          this.providerParams.style
        );
        break;
      case "sentinel":
        throw new Error("Sentinel provider not implemented yet");
      default:
        throw new Error(
          `Unknown provider: ${(this.providerParams as any).provider}`
        );
    }

    // Verify data provider was initialized
    if (!this.dataProvider) {
      throw new Error("Failed to initialize data provider");
    }

    this.model = (await AutoModel.from_pretrained(this.model_id, {
      dtype: "fp32",
    })) as any;

    this.processor = await AutoProcessor.from_pretrained(this.model_id, {});

    this.initialized = true;
  }

  private async polygon_to_image(
    polygon: GeoJSON.Feature
  ): Promise<GeoRawImage> {
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }
    const image = this.dataProvider.getImage(polygon);
    return image;
  }

  async detection(polygon: GeoJSON.Feature): Promise<ObjectDetectionResults> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    // Double-check data provider after initialization
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    const geoRawImage = await this.polygon_to_image(polygon);

    let outputs;
    let inputs;
    try {
      if (!this.processor || !this.model) {
        throw new Error("Model or processor not initialized");
      }
      inputs = await this.processor(geoRawImage as RawImage);
      outputs = await this.model({
        images: inputs.pixel_values,
        confidence: 0.9,
      });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    const results = postProcessYoloOutput(
      outputs,
      inputs.pixel_values,
      geoRawImage as RawImage,
      (this.model.config as any).id2label
    );

    return {
      detections: results,
      geoRawImage,
    };
  }
}
