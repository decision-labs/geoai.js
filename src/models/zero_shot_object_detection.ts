import { pipeline, RawImage } from "@huggingface/transformers";
import { detectionsToGeoJSON, parametersChanged } from "@/utils/utils";
import { BaseModel } from "./base_model";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedOptions } from "@huggingface/transformers";
import { mapSourceConfig } from "@/core/types";

export interface ObjectDetectionResults {
  detections: GeoJSON.FeatureCollection;
  geoRawImage: GeoRawImage;
}

export class ZeroShotObjectDetection extends BaseModel {
  protected static instance: ZeroShotObjectDetection | null = null;
  private detector: any;
  public rawDetections: any[] = [];

  protected constructor(
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
  ): Promise<{ instance: ZeroShotObjectDetection }> {
    if (
      !ZeroShotObjectDetection.instance ||
      parametersChanged(
        ZeroShotObjectDetection.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      ZeroShotObjectDetection.instance = new ZeroShotObjectDetection(
        model_id,
        providerParams,
        modelParams
      );
      await ZeroShotObjectDetection.instance.initialize();
    }
    return { instance: ZeroShotObjectDetection.instance };
  }

  protected async initializeModel(): Promise<void> {
    this.detector = await pipeline(
      "zero-shot-object-detection",
      this.model_id,
      this.modelParams
    );
  }

  /**
   * Performs object detection on a geographic area using a zero-shot learning model
   * @param polygon - A GeoJSON Feature representing the geographic area to analyze
   * @param text - Label or array of labels to detect in the image
   * @param options - Detection configuration options
   * @param options.topk - Maximum number of detections to return (default: 4)
   * @param options.threshold - Confidence threshold for detections (default: 0.2)
   * @returns Promise resolving to object detection results containing GeoJSON features and raw image data
   * @throws Error if data provider is not initialized
   */
  async inference(
    polygon: GeoJSON.Feature,
    text: string | string[],
    options = {
      topk: 4,
      threshold: 0.2,
    },
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
    try {
      const candidate_labels = Array.isArray(text) ? text : [text];
      outputs = await this.detector(geoRawImage as RawImage, candidate_labels, {
        topk: options.topk,
        threshold: options.threshold,
      });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }
    this.rawDetections = outputs;
    const detectionsGeoJson = detectionsToGeoJSON(outputs, geoRawImage);
    return {
      detections: detectionsGeoJson,
      geoRawImage,
    };
  }
}
