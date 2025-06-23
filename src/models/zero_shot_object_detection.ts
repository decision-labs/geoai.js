import { pipeline, RawImage } from "@huggingface/transformers";
import { detectionsToGeoJSON, parametersChanged } from "@/utils/utils";
import { BaseModel } from "./base_model";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedOptions } from "@huggingface/transformers";
import { InferenceParameters } from "@/core/types";

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
    params: InferenceParameters
  ): Promise<ObjectDetectionResults> {
    const {
      inputs: { polygon, classLabel: text },
      post_processing_parameters: { threshold = 0.2, topk = 4 } = {},
      map_source_parameters,
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
      map_source_parameters?.zoomLevel,
      map_source_parameters?.bands,
      map_source_parameters?.expression
    );

    let outputs;
    try {
      const candidate_labels = Array.isArray(text) ? text : [text];
      outputs = await this.detector(geoRawImage as RawImage, candidate_labels, {
        topk: topk,
        threshold: threshold,
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
