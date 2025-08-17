import { BaseModel } from "@/models/base_model";
import {
  ImageProcessor,
  PreTrainedModel,
  PretrainedModelOptions,
} from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import * as ort from "onnxruntime-web";
import { InferenceParams, ObjectDetectionResults } from "@/core/types";

export class OilStorageTankDetection extends BaseModel {
  protected static instance: OilStorageTankDetection | null = null;
  protected model: ort.InferenceSession | undefined;
  protected processor: ImageProcessor | undefined;

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
  ): Promise<{ instance: OilStorageTankDetection }> {
    if (
      !OilStorageTankDetection.instance ||
      parametersChanged(
        OilStorageTankDetection.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      OilStorageTankDetection.instance = new OilStorageTankDetection(
        model_id,
        providerParams,
        modelParams
      );
      await OilStorageTankDetection.instance.initialize();
    }
    return { instance: OilStorageTankDetection.instance };
  }

  protected async initializeModel(): Promise<void> {
    // Only load the model if not already loaded
    if (this.model) return;
    this.processor = await ImageProcessor.from_pretrained(this.model_id);
    const pretrainedModel = await PreTrainedModel.from_pretrained(
      this.model_id,
      this.modelParams
    );
    this.model = pretrainedModel.sessions.model;
  }

  async inference(params: InferenceParams): Promise<ObjectDetectionResults> {
    const {
      inputs: { polygon },
      postProcessingParams: {
        confidenceThreshold = 0.5,
        nmsThreshold = 0.3,
      } = {},
      mapSourceParams,
    } = params;

    if (!polygon) {
      throw new Error("Polygon input is required for segmentation");
    }

    if (!polygon.geometry || polygon.geometry.type !== "Polygon") {
      throw new Error("Input must be a valid GeoJSON Polygon feature");
    }
    // Ensure initialization is complete
    await this.initialize();

    // Double-check data provider after initialization
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    const geoRawImage = await this.polygonToImage(
      polygon,
      mapSourceParams?.zoomLevel,
      mapSourceParams?.bands,
      mapSourceParams?.expression
    );

    if (!this.processor) {
      throw new Error("Processor not initialized");
    }
    const inputs = await this.processor(geoRawImage);
    const inferenceStartTime = performance.now();
    console.log("[oil-storage-tank-detection] starting inference...");
    let outputs;
    try {
      if (!this.model) {
        throw new Error("Model not initialized");
      }
      outputs = await this.model.run({ images: inputs.pixel_values });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    outputs = await this.postProcessor(
      outputs.output,
      geoRawImage,
      confidenceThreshold as number,
      nmsThreshold as number
    );
    const inferenceEndTime = performance.now();
    console.log(
      `[oil-storage-tank-detection] inference completed. Time taken: ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`
    );

    return {
      detections: outputs,
      geoRawImage,
    };
  }

  protected async postProcessor(
    outputs: any,
    geoRawImage: GeoRawImage,
    CONFIDENCE_THRESHOLD: number = 0.5,
    NMS_THRESHOLD: number = 0.3
  ): Promise<GeoJSON.FeatureCollection> {
    // Get the output tensor data
    const outputData = outputs.data;
    const [_, boxes, dims] = outputs.dims;

    // Reshape the output to [boxes, 6] format
    const predictions = [];
    for (let i = 0; i < boxes; i++) {
      const box = {
        center_x: outputData[i * dims],
        center_y: outputData[i * dims + 1],
        width: outputData[i * dims + 2],
        height: outputData[i * dims + 3],
        confidence: outputData[i * dims + 4],
        class_score: outputData[i * dims + 5],
      };
      predictions.push(box);
    }

    // Filter by confidence threshold
    const filteredPredictions = predictions.filter(
      box => box.confidence > CONFIDENCE_THRESHOLD
    );

    // Perform non-maximum suppression
    const finalPredictions = [];
    const sorted = filteredPredictions.sort(
      (a, b) => b.confidence - a.confidence
    );

    for (const pred of sorted) {
      let keep = true;
      for (const final of finalPredictions) {
        const iou = calculateIOU(pred, final);
        if (iou > NMS_THRESHOLD) {
          keep = false;
          break;
        }
      }
      if (keep) {
        finalPredictions.push(pred);
      }
    }

    // Helper function to calculate Intersection over Union
    // TODO: move to utilities for future reuse
    function calculateIOU(box1: any, box2: any) {
      const x1 = Math.max(
        box1.center_x - box1.width / 2,
        box2.center_x - box2.width / 2
      );
      const y1 = Math.max(
        box1.center_y - box1.height / 2,
        box2.center_y - box2.height / 2
      );
      const x2 = Math.min(
        box1.center_x + box1.width / 2,
        box2.center_x + box2.width / 2
      );
      const y2 = Math.min(
        box1.center_y + box1.height / 2,
        box2.center_y + box2.height / 2
      );

      const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
      const area1 = box1.width * box1.height;
      const area2 = box2.width * box2.height;
      return intersection / (area1 + area2 - intersection);
    }

    // Convert predictions to GeoJSON features
    const features: GeoJSON.Feature[] = finalPredictions.map(box => {
      // Convert center coordinates and dimensions to corner coordinates
      const x1 = box.center_x - box.width / 2;
      const y1 = box.center_y - box.height / 2;
      const x2 = box.center_x + box.width / 2;
      const y2 = box.center_y + box.height / 2;

      // Convert normalized coordinates to image coordinates
      const imageWidth = geoRawImage.width;
      const imageHeight = geoRawImage.height;

      // Scale coordinates from 1024x1024 to original image dimensions
      const coords = [
        [x1 * (imageWidth / 1024), y1 * (imageHeight / 1024)],
        [x2 * (imageWidth / 1024), y1 * (imageHeight / 1024)],
        [x2 * (imageWidth / 1024), y2 * (imageHeight / 1024)],
        [x1 * (imageWidth / 1024), y2 * (imageHeight / 1024)],
        [x1 * (imageWidth / 1024), y1 * (imageHeight / 1024)], // Close the polygon
      ];

      // Convert image coordinates to geo coordinates
      const geoCoords = coords.map(coord =>
        geoRawImage.pixelToWorld(coord[0], coord[1])
      );

      return {
        type: "Feature",
        properties: {
          confidence: box.class_score,
        },
        geometry: {
          type: "Polygon",
          coordinates: [geoCoords],
        },
      };
    });

    return {
      type: "FeatureCollection",
      features,
    };
  }
}
