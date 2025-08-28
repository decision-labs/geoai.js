import { maskToGeoJSON, parametersChanged } from "@/utils/utils";
import { ProviderParams } from "@/geoai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import {
  PreTrainedModel,
  PretrainedModelOptions,
  ImageProcessor,
  Tensor,
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

    const masksArray: Tensor[] = [];
    for (let idx = 0; idx < maskDims[0]; idx++) {
      const maskArray = new Uint8Array(maskHeight * maskWidth);
      const startIdx = idx * maskHeight * maskWidth;

      for (let i = 0; i < maskHeight * maskWidth; i++) {
        maskArray[i] = maskData[startIdx + i] > 0.5 ? 255 : 0; // Binarize mask
      }

      const tensor = new Tensor("uint8", maskArray, [
        1,
        1,
        maskHeight,
        maskWidth,
      ]);
      masksArray.push(tensor);
    }

    const features: GeoJSON.Feature[] = [];
    const masksToFC = maskToGeoJSON({ mask: masksArray }, geoRawImage);
    if (masksToFC.length > 0) {
      masksToFC.forEach(fc => {
        fc.features.forEach(feature => {
          features.push(feature);
        });
      });
    }
    return {
      type: "FeatureCollection",
      features,
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

    const geoRawImage = (await this.polygonToImage(
      polygon,
      mapSourceParams?.zoomLevel,
      mapSourceParams?.bands,
      mapSourceParams?.expression
    )) as GeoRawImage;

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

    const geoRawImage = (await this.polygonToImage(
      polygon,
      mapSourceParams?.zoomLevel,
      mapSourceParams?.bands,
      mapSourceParams?.expression
    )) as GeoRawImage;
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
    if (!masks || !masks.data || !masks.dims) {
      throw new Error("Invalid output format: masks not found.");
    }

    const maskData = masks.data as Float32Array;
    const maskDims = masks.dims;
    const maskHeight = maskDims[2];
    const maskWidth = maskDims[3];

    const numMasks = maskDims[0]; // Number of masks
    const masksArray: Tensor[] = [];

    for (let idx = 0; idx < numMasks; idx++) {
      const maskArray = new Uint8Array(maskHeight * maskWidth);
      const startIdx = idx * maskHeight * maskWidth;

      for (let i = 0; i < maskHeight * maskWidth; i++) {
        maskArray[i] = maskData[startIdx + i] > 0.5 ? 255 : 0;
      }
      const tensor = new Tensor("uint8", maskArray, [
        1,
        1,
        maskHeight,
        maskWidth,
      ]);
      masksArray.push(tensor);
    }

    const features: GeoJSON.Feature[] = [];
    const masksToFC = maskToGeoJSON({ mask: masksArray }, geoRawImage);
    if (masksToFC.length > 0) {
      masksToFC.forEach(fc => {
        fc.features.forEach(feature => {
          features.push(feature);
        });
      });
    }
    return {
      type: "FeatureCollection",
      features,
    };
  }
}
