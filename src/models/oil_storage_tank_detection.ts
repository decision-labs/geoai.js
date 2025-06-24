import { BaseModel } from "@/models/base_model";
import { PretrainedOptions, RawImage } from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import * as ort from "onnxruntime-web";
import { loadOnnxModel } from "./model_utils";
import { InferenceParams, ObjectDetectionResults } from "@/core/types";
const cv = require("@techstark/opencv-js");

export class OilStorageTankDetection extends BaseModel {
  protected static instance: OilStorageTankDetection | null = null;
  protected model: ort.InferenceSession | undefined;

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
    this.model = await loadOnnxModel(this.model_id);
  }

  protected async preProcessor(
    image: GeoRawImage
  ): Promise<{ input: ort.Tensor }> {
    let rawImage = new RawImage(
      image.data,
      image.height,
      image.width,
      image.channels
    );

    // If image has 4 channels, remove the alpha channel
    if (rawImage.channels > 3) {
      const newData = new Uint8Array(rawImage.width * rawImage.height * 3);
      for (let i = 0, j = 0; i < rawImage.data.length; i += 4, j += 3) {
        newData[j] = rawImage.data[i]; // R
        newData[j + 1] = rawImage.data[i + 1]; // G
        newData[j + 2] = rawImage.data[i + 2]; // B
      }
      rawImage = new RawImage(newData, rawImage.height, rawImage.width, 3);
    }

    const mat = cv.matFromArray(
      rawImage.height,
      rawImage.width,
      rawImage.channels === 4 ? cv.CV_8UC4 : cv.CV_8UC3,
      rawImage.data
    );

    // Resize the image to 1024x1024
    const resizedMat = new cv.Mat();
    const newSize = new cv.Size(1024, 1024);
    cv.resize(mat, resizedMat, newSize, 0, 0, cv.INTER_LINEAR);

    // Convert the resized Mat back to a Uint8Array
    const resizedImageData = new Uint8Array(resizedMat.data);

    // Create a new RawImage object with resized data
    const resizedRawImage = new RawImage(resizedImageData, 1024, 1024, 3);

    // Clean up OpenCV Mats
    mat.delete();
    resizedMat.delete();

    let tensor = resizedRawImage.toTensor("CHW");
    const data = tensor.data as Uint8Array;
    const float32Data = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      float32Data[i] = data[i];
    }
    // Create the ONNX Runtime tensor
    return {
      input: new ort.Tensor(float32Data, [
        1,
        tensor.dims[0],
        tensor.dims[1],
        tensor.dims[2],
      ]),
    };
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

    const inputs = await this.preProcessor(geoRawImage);
    let outputs;
    try {
      if (!this.model) {
        throw new Error("Model not initialized");
      }
      outputs = await this.model.run({ images: inputs.input });
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
