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
import { PretrainedOptions } from "@huggingface/transformers";
import { BaseModel } from "./base_model";
import { mapSourceConfig } from "@/core/types";

export class ObjectDetection extends BaseModel {
  protected static instance: ObjectDetection | null = null;
  private model: YolosForObjectDetection | undefined;
  private processor: Processor | undefined;

  private constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ) {
    super(model_id, providerParams, modelParams);
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

  protected async initializeModel(): Promise<void> {
    this.model = (await AutoModel.from_pretrained(
      this.model_id,
      this.modelParams
    )) as any;

    this.processor = await AutoProcessor.from_pretrained(this.model_id, {});
  }

  /**
   * Performs object detection on a geographic area specified by a GeoJSON polygon.
   *
   * @param polygon - A GeoJSON Feature representing the geographic area to analyze
   * @param confidence - Detection confidence threshold between 0 and 1. Detections below this threshold will be filtered out. Defaults to 0.9
   * @returns Promise<ObjectDetectionResults> containing detected objects as GeoJSON features and the raw image used for detection
   * @throws {Error} If data provider, model or processor are not properly initialized
   */
  async inference(
    polygon: GeoJSON.Feature,
    confidence: number = 0.9,
    mapSourceOptions: mapSourceConfig = {}
  ): Promise<ObjectDetectionResults> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    const geoRawImage = await this.polygon_to_image(
      polygon,
      mapSourceOptions.zoomLevel,
      mapSourceOptions.bands,
      mapSourceOptions.expression
    );

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
