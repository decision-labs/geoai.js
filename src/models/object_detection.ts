import {
  AutoModel,
  AutoProcessor,
  Processor,
  RawImage,
  YolosForObjectDetection,
} from "@huggingface/transformers";
import { detectionsToGeoJSON, parametersChanged } from "@/utils/utils";
import { postProcessYoloOutput } from "@/utils/utils";
import { ProviderParams } from "@/geobase-ai";
import { PretrainedModelOptions } from "@huggingface/transformers";
import { BaseModel } from "./base_model";
import { InferenceParams, ObjectDetectionResults } from "@/core/types";

export class ObjectDetection extends BaseModel {
  protected static instance: ObjectDetection | null = null;
  private model: YolosForObjectDetection | undefined;
  private processor: Processor | undefined;

  private constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedModelOptions
  ) {
    super(model_id, providerParams, modelParams);
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedModelOptions
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
  async inference(params: InferenceParams): Promise<ObjectDetectionResults> {
    const {
      inputs: { polygon },
      postProcessingParams: { confidence = 0.9 } = {},
      mapSourceParams,
    } = params;

    if (!polygon) {
      throw new Error("Polygon input is required for segmentation");
    }

    if (!polygon.geometry || polygon.geometry.type !== "Polygon") {
      throw new Error("Input must be a valid GeoJSON Polygon feature");
    }
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    const geoRawImage = await this.polygonToImage(
      polygon,
      mapSourceParams?.zoomLevel,
      mapSourceParams?.bands,
      mapSourceParams?.expression
    );

    const inferenceStartTime = performance.now();
    console.log("[oriented-object-detection] starting inference...");
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
    const inferenceEndTime = performance.now();
    console.log(
      `[oriented-object-detection] inference completed. Time taken: ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`
    );

    return {
      detections: detectionsGeoJson,
      geoRawImage,
    };
  }
}
