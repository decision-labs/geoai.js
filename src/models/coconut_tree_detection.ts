import { BaseModel } from "@/models/base_model";
import {
  ImageProcessor,
  PreTrainedModel,
  PretrainedModelOptions,
} from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";
import { ProviderParams } from "@/geoai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import * as ort from "onnxruntime-web";
import { InferenceParams, ObjectDetectionResults } from "@/core/types";

export class CoconutTreeDetection extends BaseModel {
  protected static instance: CoconutTreeDetection | null = null;
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
  ): Promise<{ instance: CoconutTreeDetection }> {
    if (
      !CoconutTreeDetection.instance ||
      parametersChanged(
        CoconutTreeDetection.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      CoconutTreeDetection.instance = new CoconutTreeDetection(
        model_id,
        providerParams,
        modelParams
      );
      await CoconutTreeDetection.instance.initialize();
    }
    return { instance: CoconutTreeDetection.instance };
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
        nmsThreshold = 0.5,
      } = {},
      mapSourceParams,
    } = params;

    if (!polygon) {
      throw new Error("Polygon input is required for coconut tree detection");
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
    console.log("[coconut-tree-detection] starting inference...");

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

    const processedOutputs = await this.postProcessor(
      outputs.output0,
      geoRawImage,
      confidenceThreshold as number,
      nmsThreshold as number
    );

    const inferenceEndTime = performance.now();
    console.log(
      `[coconut-tree-detection] inference completed. Time taken: ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`
    );

    return {
      detections: processedOutputs,
      geoRawImage,
    };
  }

  protected async postProcessor(
    outputs: ort.Tensor,
    geoRawImage: GeoRawImage,
    CONFIDENCE_THRESHOLD: number = 0.5,
    NMS_THRESHOLD: number = 0.5
  ): Promise<GeoJSON.FeatureCollection> {
    // Get the output tensor data - YOLOv11 format: [1, 5, 8400]
    const outputData = outputs.data as Float32Array;
    const [, , numDetections] = outputs.dims;

    // Reshape the output to [detections, features] format
    const predictions = [];
    for (let i = 0; i < numDetections; i++) {
      const detection = {
        center_x: outputData[i], // x center
        center_y: outputData[numDetections + i], // y center
        width: outputData[2 * numDetections + i], // width
        height: outputData[3 * numDetections + i], // height
        confidence: outputData[4 * numDetections + i], // confidence for coconut_tree class
      };
      predictions.push(detection);
    }

    // Filter by confidence threshold
    const filteredPredictions = predictions.filter(
      detection => detection.confidence > CONFIDENCE_THRESHOLD
    );

    // Perform non-maximum suppression
    const finalPredictions = [];
    const sorted = filteredPredictions.sort(
      (a, b) => b.confidence - a.confidence
    );

    for (const pred of sorted) {
      let keep = true;
      for (const final of finalPredictions) {
        const iou = this.calculateIOU(pred, final);
        if (iou > NMS_THRESHOLD) {
          keep = false;
          break;
        }
      }
      if (keep) {
        finalPredictions.push(pred);
      }
    }

    // Convert predictions to GeoJSON featureCollection
    const geoFeatures: GeoJSON.Feature[] = finalPredictions.map(detection => {
      // Convert center coordinates and dimensions to corner coordinates
      const x1 = detection.center_x - detection.width / 2;
      const y1 = detection.center_y - detection.height / 2;
      const x2 = detection.center_x + detection.width / 2;
      const y2 = detection.center_y + detection.height / 2;

      // Convert normalized coordinates to image coordinates
      const imageWidth = geoRawImage.width;
      const imageHeight = geoRawImage.height;

      // Scale coordinates from normalized space to image dimensions
      const coords = [
        [x1 * imageWidth, y1 * imageHeight],
        [x2 * imageWidth, y1 * imageHeight],
        [x2 * imageWidth, y2 * imageHeight],
        [x1 * imageWidth, y2 * imageHeight],
        [x1 * imageWidth, y1 * imageHeight], // Close the polygon
      ];

      // Convert image coordinates to geo coordinates
      const geoCoords = coords.map(coord =>
        geoRawImage.pixelToWorld(coord[0], coord[1])
      );

      return {
        type: "Feature",
        properties: {
          confidence: detection.confidence,
          class: "coconut_tree",
        },
        geometry: {
          type: "Polygon",
          coordinates: [geoCoords],
        },
      };
    });

    return {
      type: "FeatureCollection",
      features: geoFeatures,
    };
  }

  // Helper function to calculate Intersection over Union
  private calculateIOU(
    box1: { center_x: number; center_y: number; width: number; height: number },
    box2: { center_x: number; center_y: number; width: number; height: number }
  ): number {
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
}
