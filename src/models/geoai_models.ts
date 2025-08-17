import { getPolygonFromMask, parametersChanged } from "@/utils/utils";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import {
  PreTrainedModel,
  PretrainedModelOptions,
  ImageProcessor,
} from "@huggingface/transformers";
import * as ort from "onnxruntime-web";
import { BaseModel } from "./base_model";
import { InferenceParams, ObjectDetectionResults } from "@/core/types";

/**
 * Base class for all geo-based detection models
 */
abstract class BaseDetectionModel extends BaseModel {
  protected model: ort.InferenceSession | undefined;
  protected zoom?: number;
  protected processor: ImageProcessor | undefined;

  protected constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedModelOptions
  ) {
    super(model_id, providerParams, modelParams);
  }

  protected async initializeModel(): Promise<void> {
    this.processor = await ImageProcessor.from_pretrained(this.model_id);
    const pretrainedModel = await PreTrainedModel.from_pretrained(
      this.model_id,
      this.modelParams
    );
    this.model = pretrainedModel.sessions.model;
  }

  protected async postProcessor(
    outputs: any,
    geoRawImage: GeoRawImage
  ): Promise<GeoJSON.FeatureCollection> {
    const { masks } = outputs;

    const maskData = masks.data as Float32Array;
    const maskDims = masks.dims;
    const maskHeight = maskDims[2];
    const maskWidth = maskDims[3];

    const masksArray: Uint8Array[] = [];
    for (let idx = 0; idx < maskDims[0]; idx++) {
      const maskArray = new Uint8Array(maskHeight * maskWidth);
      const startIdx = idx * maskHeight * maskWidth;

      for (let i = 0; i < maskHeight * maskWidth; i++) {
        maskArray[i] = maskData[startIdx + i] > 0.5 ? 255 : 0; // Binarize mask
      }

      masksArray.push(maskArray);
    }

    const features: GeoJSON.Feature[] = [];
    if (masksArray.length > 0) {
      masksArray.forEach(maskArray => {
        const binaryMask2D: number[][] = [];
        for (let i = 0; i < maskHeight; i++) {
          const row: number[] = [];
          for (let j = 0; j < maskWidth; j++) {
            const index = i * maskWidth + j;
            row.push(maskArray[index] > 0 ? 1 : 0); // Convert to binary values
          }
          binaryMask2D.push(row);
        }

        const polygon = getPolygonFromMask(binaryMask2D, geoRawImage);
        features.push({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [polygon],
          },
          properties: {},
        });
      });

      return {
        type: "FeatureCollection",
        features,
      };
    }

    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  async inference(params: InferenceParams): Promise<ObjectDetectionResults> {
    const {
      inputs: { polygon },
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

    const task = this.model_id.split("/").pop()?.split(".")[0].split("_")[0];
    const inferenceStartTime = performance.now();
    console.log(`[${task}] starting inference...`);
    if (!this.processor) {
      throw new Error("Processor not initialized");
    }
    const inputs = await this.processor(geoRawImage);
    let outputs;
    try {
      if (!this.model) {
        throw new Error("Model not initialized");
      }
      outputs = await this.model.run({ image: inputs.pixel_values });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    outputs = await this.postProcessor(outputs, geoRawImage);
    const inferenceEndTime = performance.now();
    console.log(
      `[${task}] inference completed. Time taken: ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`
    );

    return {
      detections: outputs,
      geoRawImage,
    };
  }
}

export class SolarPanelDetection extends BaseDetectionModel {
  private static instanceRef: SolarPanelDetection | null = null;

  private constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams: PretrainedModelOptions | undefined
  ) {
    super(model_id, providerParams, modelParams);
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedModelOptions
  ): Promise<{ instance: SolarPanelDetection }> {
    if (
      !SolarPanelDetection.instanceRef ||
      parametersChanged(
        SolarPanelDetection.instanceRef,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      SolarPanelDetection.instanceRef = new SolarPanelDetection(
        model_id,
        providerParams,
        modelParams
      );
      await SolarPanelDetection.instanceRef.initialize();
    }
    return { instance: SolarPanelDetection.instanceRef };
  }
}

export class ShipDetection extends BaseDetectionModel {
  private static instanceRef: ShipDetection | null = null;

  private constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams: PretrainedModelOptions | undefined
  ) {
    super(model_id, providerParams, modelParams);
    this.zoom = 21; // Set specific zoom level for ship detection
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedModelOptions
  ): Promise<{ instance: ShipDetection }> {
    if (
      !ShipDetection.instanceRef ||
      parametersChanged(
        ShipDetection.instanceRef,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      ShipDetection.instanceRef = new ShipDetection(
        model_id,
        providerParams,
        modelParams
      );
      await ShipDetection.instanceRef.initialize();
    }
    return { instance: ShipDetection.instanceRef };
  }
}

export class CarDetection extends BaseDetectionModel {
  private static instanceRef: CarDetection | null = null;

  private constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams: PretrainedModelOptions | undefined
  ) {
    super(model_id, providerParams, modelParams);
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedModelOptions
  ): Promise<{ instance: CarDetection }> {
    if (
      !CarDetection.instanceRef ||
      parametersChanged(
        CarDetection.instanceRef,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      CarDetection.instanceRef = new CarDetection(
        model_id,
        providerParams,
        modelParams
      );
      await CarDetection.instanceRef.initialize();
    }
    return { instance: CarDetection.instanceRef };
  }
}

export class BuildingDetection extends BaseDetectionModel {
  private static instanceRef: BuildingDetection | null = null;

  private constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams: PretrainedModelOptions | undefined
  ) {
    super(model_id, providerParams, modelParams);
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedModelOptions
  ): Promise<{ instance: BuildingDetection }> {
    if (
      !BuildingDetection.instanceRef ||
      parametersChanged(
        BuildingDetection.instanceRef,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      BuildingDetection.instanceRef = new BuildingDetection(
        model_id,
        providerParams,
        modelParams
      );
      await BuildingDetection.instanceRef.initialize();
    }
    return { instance: BuildingDetection.instanceRef };
  }
}

//todo: wetland segmentation works with multiband band images need to write the code to get the mulibands from the source.
export class WetLandSegmentation extends BaseModel {
  protected static instance: WetLandSegmentation | null = null;
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
  ): Promise<{ instance: WetLandSegmentation }> {
    if (
      !WetLandSegmentation.instance ||
      parametersChanged(
        WetLandSegmentation.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      WetLandSegmentation.instance = new WetLandSegmentation(
        model_id,
        providerParams,
        modelParams
      );
      await WetLandSegmentation.instance.initialize();
    }
    return { instance: WetLandSegmentation.instance };
  }

  protected async initializeModel(): Promise<void> {
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
    const inferenceStartTime = performance.now();
    console.log("[wetland-segmentation] starting inference...");

    if (!this.processor) {
      throw new Error("Processor not initialized");
    }
    const inputs = await this.processor(geoRawImage);
    let outputs;
    try {
      if (!this.model) {
        throw new Error("Model or processor not initialized");
      }
      outputs = await this.model.run({ input: inputs.pixel_values });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    outputs = await this.postProcessor(outputs, geoRawImage);
    const inferenceEndTime = performance.now();
    console.log(
      `[wetland-segmentation] inference completed. Time taken: ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`
    );

    return {
      detections: outputs,
      geoRawImage,
    };
  }

  protected async postProcessor(
    outputs: any,
    geoRawImage: GeoRawImage
  ): Promise<GeoJSON.FeatureCollection> {
    outputs = Object.values(outputs);
    const masks = outputs[1];
    const scores = outputs[0].data as Float32Array;
    const threshold = 0.5;

    const maskData = masks.data as Float32Array;
    const maskDims = masks.dims; // [masknumber, 1, height, width]
    const maskHeight = maskDims[2];
    const maskWidth = maskDims[3];

    const features: GeoJSON.Feature[] = [];

    // Process each mask separately
    for (let idx = 0; idx < maskDims[0]; idx++) {
      if (scores[idx] > threshold) {
        const maskArray = new Uint8Array(maskHeight * maskWidth);
        const startIdx = idx * maskHeight * maskWidth;

        // Extract single mask
        for (let i = 0; i < maskHeight * maskWidth; i++) {
          maskArray[i] = maskData[startIdx + i] > 0.5 ? 1 : 0;
        }

        // Convert to 2D binary mask
        const binaryMask2D: number[][] = [];
        for (let i = 0; i < maskHeight; i++) {
          const row: number[] = [];
          for (let j = 0; j < maskWidth; j++) {
            const index = i * maskWidth + j;
            row.push(maskArray[index]);
          }
          binaryMask2D.push(row);
        }

        // Convert mask to polygon
        const polygon = getPolygonFromMask(binaryMask2D, geoRawImage);
        if (polygon) {
          features.push({
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [polygon],
            },
            properties: {
              score: scores[idx],
            },
          });
        }
      }
    }

    return {
      type: "FeatureCollection",
      features,
    };
  }
}
