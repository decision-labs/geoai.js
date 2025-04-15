import { Mapbox } from "@/data_providers/mapbox";
import { PretrainedOptions, RawImage } from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { Geobase } from "@/data_providers/geobase";
// TODO: check best way in typescript projects to separate types from other objects
import { ObjectDetectionResults } from "./zero_shot_object_detection";
import * as ort from "onnxruntime-web";
const cv = require("@techstark/opencv-js");

export class OilStorageTankDetection {
  private static instance: OilStorageTankDetection | null = null;
  protected providerParams: ProviderParams;
  protected dataProvider: Mapbox | Geobase | undefined;
  protected model_id: string; // model name or path
  protected model: ort.InferenceSession | undefined;
  protected initialized: boolean = false;
  protected zoom?: number;

  private constructor(model_id: string, providerParams: ProviderParams) {
    this.model_id = model_id;
    this.providerParams = providerParams;
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
        providerParams
      );
      await OilStorageTankDetection.instance.initialize();
    }
    return { instance: OilStorageTankDetection.instance };
  }

  protected async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize data provider
    this.initializeDataProvider();

    // Verify data provider was initialized
    if (!this.dataProvider) {
      throw new Error("Failed to initialize data provider");
    }

    // Fetch and load model
    await this.loadModel();
    this.initialized = true;
  }

  private async loadModel(): Promise<void> {
    // Load model from local file path
    try {
      const response = await fetch(this.model_id);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch model from URL: ${response.statusText}`
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Load model using ONNX Runtime
      this.model = await ort.InferenceSession.create(uint8Array);
    } catch (error) {
      throw new Error(
        `Failed to load model from URL ${this.model_id}: ${error}`
      );
    }
  }

// TODO: refactor that's common across models
  private initializeDataProvider(): void {
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

  protected async preProcessor(
    rawImage: GeoRawImage
  ): Promise<{ input: ort.Tensor }> {
    let mat = cv.matFromArray(
      rawImage.height,
      rawImage.width,
      rawImage.channels === 4 ? cv.CV_8UC4 : cv.CV_8UC3,
      rawImage.data
    );

    // Resize the image to 1024x1024
    let resizedMat = new cv.Mat();
    let newSize = new cv.Size(1024, 1024);
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

  async inference(
    polygon: GeoJSON.Feature,
    confidenceThreshold: number,
    nmsThreshold: number
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
      confidenceThreshold,
      nmsThreshold
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
