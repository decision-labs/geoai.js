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
import { InferenceParams, ObjectDetectionResults, ProgressCallbackPayload } from "@/core/types";

/**
 * Base class for all geo-based detection models
 */
abstract class BaseDetectionModel extends BaseModel {
  protected model: ort.InferenceSession | undefined;
  protected zoom?: number;
  protected processor: ImageProcessor | undefined;
  private sessionQueue: Promise<any> = Promise.resolve();

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

  /**
   * Safely run inference with session queuing to prevent concurrent access
   */
  private async safeRunInference(singleImageTensor: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.sessionQueue = this.sessionQueue.then(async () => {
        try {
          if (!this.model) {
            throw new Error("Model not initialized");
          }
          const result = await this.model.run({ image: singleImageTensor });
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });
    });
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
    const numMasks = maskDims[0];
    const maskSize = maskHeight * maskWidth;
    
    // Pre-allocate array for better performance
    for (let idx = 0; idx < numMasks; idx++) {
      const maskArray = new Uint8Array(maskSize);
      const startIdx = idx * maskSize;

      // More efficient binarization using bitwise operations
      for (let i = 0; i < maskSize; i++) {
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
      mapSourceParams?.expression,
      true,
      // (!inferencePerTile && true)
    )) as GeoRawImage;
    const patches = await geoRawImage.toPatches(512, 512);

    console.log({geoRawImage})

    const flatGeorawImage = (patches as unknown as GeoRawImage[][]).flat()

    const task = this.model_id.split("/").pop()?.split(".")[0].split("_")[0];
    console.log(`[${task}] starting inference...`);
    if (!this.processor) {
      throw new Error("Processor not initialized");
    }
    const inputs = await this.processor(flatGeorawImage);
    console.log({inputs});
    
    // Note: The processor handles data type conversion (typically to float32 for model input)
    // The postProcessor converts back to uint8 for mask generation
    
    const batchSize = inputs.pixel_values.dims[0];
    const channels = inputs.pixel_values.dims[1];
    const side1 = inputs.pixel_values.dims[2];
    const side2 = inputs.pixel_values.dims[3];
    
    // Process images with controlled concurrency (serialized model access)
    const imageDataSize = channels * side1 * side2;
    const overallStartTime = performance.now();

    // Process images in chunks - model access is serialized to prevent session conflicts
    const maxConcurrent = Math.min(batchSize, 4); // Process max 4 images concurrently
    const allDetections: GeoJSON.Feature[] = [];
    const inferenceRunTimes: number[] = [];

    // Process images in chunks
    for (let chunkStart = 0; chunkStart < batchSize; chunkStart += maxConcurrent) {
      const chunkEnd = Math.min(chunkStart + maxConcurrent, batchSize);
      
      // Create promises for this chunk
      const chunkPromises = [];
      for (let i = chunkStart; i < chunkEnd; i++) {
        chunkPromises.push(
          (async () => {
            // Create a new tensor for the single image
            const startIdx = i * imageDataSize;
            const endIdx = startIdx + imageDataSize;
            
            const singleImageTensor: any = new Tensor(
              'float32',
              inputs.pixel_values.data.subarray(startIdx, endIdx),
              [1, channels, side1, side2]
            );
            
            let outputs;
            try {
              const singleInferenceStartTime = performance.now();
              outputs = await this.safeRunInference(singleImageTensor);
              const singleInferenceEndTime = performance.now();
              const inferenceTime = singleInferenceEndTime - singleInferenceStartTime;
              
              // Perform post-processing for each individual output
              const postProcessedOutputs = await this.postProcessor(outputs, flatGeorawImage[i]);
              
              // Progress callback
              if(params.onProgress){
                console.log('[Progress Callback] sending progress')
                const payload: ProgressCallbackPayload = {
                  progress : i,
                  detections : postProcessedOutputs,
                  geoRawImage : flatGeorawImage[i]
                }
                params.onProgress(payload);
              }
              
              return {
                features: postProcessedOutputs.features,
                inferenceTime: inferenceTime,
                imageIndex: i
              };
            } catch (error) {
              console.debug("error", error);
              throw error;
            }
          })()
        );
      }

      // Wait for this chunk to complete
      const chunkResults = await Promise.all(chunkPromises);
      
      // Sort results by image index to maintain order
      chunkResults.sort((a, b) => a.imageIndex - b.imageIndex);
      
      // Collect results from this chunk
      for (const result of chunkResults) {
        allDetections.push(...result.features);
        inferenceRunTimes.push(result.inferenceTime);
      }
    }

    const overallEndTime = performance.now();

    // Log performance metrics
    const totalInferenceTime = inferenceRunTimes.reduce((a, b) => a + b, 0);
    const averageInferenceTime = totalInferenceTime / inferenceRunTimes.length;
    const totalWallTime = overallEndTime - overallStartTime;
    
    console.log(
        `[${task}] processed ${batchSize} images with serialized model access. ` +
        `Average inference time: ${averageInferenceTime.toFixed(2)}ms, ` +
        `Total wall time: ${totalWallTime.toFixed(2)}ms, ` +
        `Efficiency: ${(totalInferenceTime / totalWallTime).toFixed(2)}x`
    );

    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features : allDetections,
    }
    // const north = (patches as any)[0][0].getBounds().north;
    // const south = (geoRawImage as any)[(geoRawImage as any).length - 1][0].getBounds().south;
    // const west = (geoRawImage as any)[0][0].getBounds().west;
    // const east = (geoRawImage as any)[0][(geoRawImage as any)[0].length - 1].getBounds().east;

    // const bounds: Bounds = {
    //   north: north,
    //   south: south,
    //   east: east,
    //   west: west,
    // };


    return {
      detections: fc,
      geoRawImage//GeoRawImage.fromPatches((geoRawImage as unknown as RawImage[][]),bounds,"EPSG:4326"),
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
