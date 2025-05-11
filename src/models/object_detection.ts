import { Mapbox } from "@/data_providers/mapbox";
import {
  AutoModel,
  AutoProcessor,
  Processor,
  RawImage,
  YolosForObjectDetection,
} from "@huggingface/transformers";
import { detectionsToGeoJSON, parametersChanged } from "@/utils/utils";

import { ObjectDetectionResults } from "../models/zero_shot_object_detection";
import { postProcessYoloOutput } from "@/utils/utils";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedOptions } from "@huggingface/transformers";
import { Geobase } from "@/data_providers/geobase";

export class ObjectDetection {
  private static instance: ObjectDetection | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | Geobase | undefined;
  private model_id: string;
  private model: YolosForObjectDetection | undefined;
  private processor: Processor | undefined;
  private modelParams: PretrainedOptions | undefined;
  private initialized: boolean = false;

  private constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ) {
    this.model_id = model_id;
    this.providerParams = providerParams;
    this.modelParams = modelParams;
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
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
      case "geobase":
        this.dataProvider = new Geobase({
          projectRef: this.providerParams.projectRef,
          cogImagery: this.providerParams.cogImagery,
          apikey: this.providerParams.apikey,
        });
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

    this.model = (await AutoModel.from_pretrained(
      this.model_id,
      this.modelParams
    )) as any;

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

  /**
   * Performs object detection on a geographic area specified by a GeoJSON polygon.
   *
   * @param polygon - A GeoJSON Feature representing the geographic area to analyze
   * @param confidence - Detection confidence threshold between 0 and 1. Detections below this threshold will be filtered out. Defaults to 0.9
   * @returns Promise<ObjectDetectionResults> containing detected objects as GeoJSON features and the raw image used for detection
   * @throws {Error} If data provider, model or processor are not properly initialized
   */
  async detection(
    polygon: GeoJSON.Feature,
    confidence: number = 0.9
  ): Promise<ObjectDetectionResults> {
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
        confidence,
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

    const detectionsGeoJson = detectionsToGeoJSON(results, geoRawImage);

    return {
      detections: detectionsGeoJson,
      geoRawImage,
    };
  }
}
