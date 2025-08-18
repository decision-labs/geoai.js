import { BaseModel } from "@/models/base_model";
import {
  ImageProcessor,
  PreTrainedModel,
  PretrainedModelOptions,
} from "@huggingface/transformers";
import { parametersChanged, getPolygonFromMask } from "@/utils/utils";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import * as ort from "onnxruntime-web";
import { InferenceParams, ObjectDetectionResults } from "@/core/types";
const cv = require("@techstark/opencv-js");

export class BuildingFootPrintSegmentation extends BaseModel {
  protected static instance: BuildingFootPrintSegmentation | null = null;
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
  ): Promise<{ instance: BuildingFootPrintSegmentation }> {
    if (
      !BuildingFootPrintSegmentation.instance ||
      parametersChanged(
        BuildingFootPrintSegmentation.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      BuildingFootPrintSegmentation.instance =
        new BuildingFootPrintSegmentation(
          model_id,
          providerParams,
          modelParams
        );
      await BuildingFootPrintSegmentation.instance.initialize();
    }
    return { instance: BuildingFootPrintSegmentation.instance };
  }

  protected async initializeModel(): Promise<void> {
    // Only load the model if not already loaded
    if (this.model) return;
    this.processor = await ImageProcessor.from_pretrained(
      this.model_id,
      this.modelParams
    );
    const pretrainedModel = await PreTrainedModel.from_pretrained(
      this.model_id,
      this.modelParams
    );
    this.model = pretrainedModel.sessions.model;
  }

  public async inference(
    params: InferenceParams
  ): Promise<ObjectDetectionResults> {
    const {
      inputs: { polygon },
      postProcessingParams: { confidenceThreshold = 0.5, minArea = 20 } = {},
      mapSourceParams,
    } = params;

    if (!polygon) {
      throw new Error(
        "Polygon input is required for building footprint segmentation"
      );
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

    const patchSize = 256;
    const geoRawImage = await this.polygonToImage(
      polygon,
      mapSourceParams?.zoomLevel,
      mapSourceParams?.bands,
      mapSourceParams?.expression
    );
    const geoPatches = await geoRawImage.toPatches(patchSize, patchSize);
    // Calculate number of patches
    const numRows = geoPatches.length;
    const numCols = geoPatches[0].length;

    const geoPatchesFlat = geoPatches.flat();
    console.log(`Inferencing on ${geoPatchesFlat.length} patches`);

    // Initialize prediction array
    let prediction: any[] = [];
    const inferenceStartTime = performance.now();
    console.log("[building-footprint-segmentation] starting inference...");

    try {
      if (!this.model) {
        throw new Error("Model not initialized");
      }

      if (!this.processor) {
        throw new Error("Processor not initialized");
      }

      // Perform batch inference on all patches at once
      const inputsAll = await this.processor(geoPatchesFlat);
      const pixelValues = inputsAll.pixel_values.permute(0, 2, 3, 1);
      const resultAll = await this.model.run({ input_1: pixelValues });
      const patchPredictionsData = resultAll.conv2d_12.data as Float32Array;

      const patchDataSize = patchSize * patchSize;
      let patchIndex = 0;

      // Process each row
      for (let i = 0; i < numRows; i++) {
        // Create array to store patches for this row
        const rowPatches: any[] = [];

        // Process each patch in the row, extracting from the single batch result
        for (let j = 0; j < numCols; j++) {
          // Get the start and end index for the current patch's data
          const startIndex = patchIndex * patchDataSize;
          const endIndex = startIndex + patchDataSize;

          // Create a new Float32Array view for the current patch's prediction
          const patchPrediction = patchPredictionsData.subarray(
            startIndex,
            endIndex
          );

          // Convert patch prediction to Mat
          const patchPredictionMat = new cv.Mat(
            patchSize,
            patchSize,
            cv.CV_32F
          );
          for (let y = 0; y < patchSize; y++) {
            for (let x = 0; x < patchSize; x++) {
              const idx = y * patchSize + x;
              patchPredictionMat.floatPtr(y)[x] = patchPrediction[idx];
            }
          }

          // Add to row patches array
          rowPatches.push(patchPredictionMat);
          patchIndex++;
        }

        // Concatenate patches horizontally for this row
        if (rowPatches.length > 0) {
          // Create a MatVector for hconcat
          const matVector = new cv.MatVector();
          rowPatches.forEach(mat => matVector.push_back(mat));

          const rowMat = new cv.Mat();
          cv.hconcat(matVector, rowMat);

          prediction.push(rowMat);

          // Clean up the temporary Mats in the rowPatches array
          rowPatches.forEach(mat => mat.delete());
        }
      }

      // Concatenate all rows vertically
      const finalMatVector = new cv.MatVector();
      prediction.forEach(mat => finalMatVector.push_back(mat));

      const finalMat = new cv.Mat();
      cv.vconcat(finalMatVector, finalMat);

      // Clean up the temporary Mats in the prediction array
      prediction.forEach(mat => mat.delete());

      // Remove padding
      const xx = Math.floor(geoRawImage.width / patchSize) * patchSize;
      const yy = Math.floor(geoRawImage.height / patchSize) * patchSize;

      // Calculate padding amounts
      const xPad = xx - geoRawImage.width;
      const yPad = yy - geoRawImage.height;

      const padX0 = Math.floor(xPad / 2);
      const padY0 = Math.floor(yPad / 2);

      const croppedPrediction = new cv.Mat();
      const roi = new cv.Rect(
        padX0,
        padY0,
        geoRawImage.width,
        geoRawImage.height
      );
      finalMat.roi(roi).copyTo(croppedPrediction);
      finalMat.delete(); // Clean up the final concatenated Mat

      // Post-processing timing
      const results = await this.postProcessor(
        croppedPrediction,
        geoRawImage,
        confidenceThreshold as number,
        minArea as number
      );
      croppedPrediction.delete(); // Clean up the cropped Mat
      const inferenceEndTime = performance.now();
      console.log(
        `[building-footprint-segmentagtion] inference completed. Time taken: ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`
      );

      return results;
    } catch (error) {
      throw error;
    }
  }

  protected async postProcessor(
    outputs: any,
    geoRawImage: GeoRawImage,
    CONFIDENCE_THRESHOLD: number = 0.5,
    minArea: number = 20
  ): Promise<ObjectDetectionResults> {
    // Convert to binary image using threshold
    const binaryMat = new cv.Mat();
    try {
      cv.threshold(
        outputs,
        binaryMat,
        CONFIDENCE_THRESHOLD,
        1.0,
        cv.THRESH_BINARY
      ); // Use 0.5 threshold for float32 data

      // Convert to uint8 for contour detection
      const uint8Mat = new cv.Mat();
      binaryMat.convertTo(uint8Mat, cv.CV_8U, 255.0);

      // Find contours
      let contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(
        uint8Mat,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      // Filter contours by minimum area
      const filteredContours = new cv.MatVector();

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        if (area >= minArea) {
          filteredContours.push_back(contour);
        }
      }

      // Replace original contours with filtered ones
      contours.delete();
      contours = filteredContours;

      // Convert contours to GeoJSON features
      const features: GeoJSON.Feature[] = [];
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);

        // Create binary mask for this contour
        const mask = new Array(geoRawImage.height)
          .fill(0)
          .map(() => new Array(geoRawImage.width).fill(0));
        const contourImage = new cv.Mat(
          geoRawImage.height,
          geoRawImage.width,
          cv.CV_8UC1,
          new cv.Scalar(0)
        );
        cv.drawContours(contourImage, contours, i, new cv.Scalar(255), -1); // -1 fills the contour

        // Convert contour image to binary mask array
        for (let y = 0; y < contourImage.rows; y++) {
          for (let x = 0; x < contourImage.cols; x++) {
            mask[y][x] = contourImage.ucharPtr(y)[x] > 0 ? 1 : 0;
          }
        }

        // Get polygon using getPolygonFromMask
        const polygon = getPolygonFromMask(mask, geoRawImage);

        // Create feature from polygon
        features.push({
          type: "Feature",
          properties: {
            confidence: 1.0,
          },
          geometry: {
            type: "Polygon",
            coordinates: [polygon],
          },
        });

        // Clean up
        contourImage.delete();
        contour.delete();
      }

      // Clean up resources
      uint8Mat.delete();
      contours.delete();
      hierarchy.delete();

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features,
      };
      return {
        detections: geojson,
        geoRawImage,
      };
    } catch (error) {
      console.error("Error processing contours:", error);
      throw error;
    } finally {
      // Ensure all resources are cleaned up
      binaryMat.delete();
    }
  }
}
