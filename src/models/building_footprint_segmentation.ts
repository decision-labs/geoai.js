import { BaseModel } from "@/models/base_model";
import {
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
    const pretrainedModel = await PreTrainedModel.from_pretrained(
      this.model_id,
      this.modelParams
    );
    this.model = pretrainedModel.sessions.model;
  }

  protected async preProcessor(
    rawImage: GeoRawImage
  ): Promise<{ originalImage: any; paddedImage: any; patchSize: number }> {
    // Convert raw image to OpenCV Mat
    const mat = cv.matFromArray(
      rawImage.height,
      rawImage.width,
      rawImage.channels === 4 ? cv.CV_8UC4 : cv.CV_8UC3,
      rawImage.data
    );

    // Convert BGR to RGB
    const rgbMat = new cv.Mat();
    cv.cvtColor(mat, rgbMat, cv.COLOR_BGR2RGB);

    // Calculate padding
    const patchSize = 256;
    const height = rgbMat.rows;
    const width = rgbMat.cols;

    // Calculate desired shape
    const xx = Math.floor(width / patchSize) * patchSize;
    const yy = Math.floor(height / patchSize) * patchSize;

    // Calculate padding amounts
    const xPad = xx - width;
    const yPad = yy - height;

    const x0 = Math.floor(xPad / 2);
    const x1 = xPad - x0;
    const y0 = Math.floor(yPad / 2);
    const y1 = yPad - y0;

    // Apply padding
    const paddedMat = new cv.Mat();
    const padding = new cv.Scalar(0, 0, 0);
    cv.copyMakeBorder(
      rgbMat,
      paddedMat,
      y0,
      y1,
      x0,
      x1,
      cv.BORDER_CONSTANT,
      padding
    );

    // Convert to float32 and normalize
    const floatMat = new cv.Mat();
    paddedMat.convertTo(floatMat, cv.CV_32F, 1.0 / 255.0);

    // Clean up intermediate Mats
    mat.delete();
    rgbMat.delete();

    return {
      originalImage: floatMat,
      paddedImage: paddedMat,
      patchSize,
    };
  }

  public async inference(
    params: InferenceParams
  ): Promise<ObjectDetectionResults> {
    const inferenceStartTime = performance.now();
    console.log("[building-footprint-segmentation] starting inference...");

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
    const { originalImage, paddedImage } = await this.preProcessor(geoRawImage);

    // Calculate number of patches
    const numRows = Math.floor(paddedImage.rows / patchSize);
    const numCols = Math.floor(paddedImage.cols / patchSize);

    // Initialize prediction array
    let prediction: any[] = [];

    try {
      if (!this.model) {
        throw new Error("Model not initialized");
      }

      // Process each row
      for (let i = 0; i < numRows; i++) {
        // Create array to store patches for this row
        const rowPatches: any[] = [];

        // Process each patch in the row
        for (let j = 0; j < numCols; j++) {
          // Extract patch
          const patch = new cv.Mat();
          const roi = new cv.Rect(
            j * patchSize,
            i * patchSize,
            patchSize,
            patchSize
          );
          originalImage.roi(roi).copyTo(patch);

          // Create tensor for patch - properly reshape the data in RGB format
          const patchData = new Float32Array(patchSize * patchSize * 3);
          for (let h = 0; h < patchSize; h++) {
            for (let w = 0; w < patchSize; w++) {
              // Convert BGR to RGB by swapping channels
              const idx = h * patchSize * 3 + w * 3;
              patchData[idx] = patch.floatPtr(h)[w * 3 + 2]; // R channel (was B)
              patchData[idx + 1] = patch.floatPtr(h)[w * 3 + 1]; // G channel (stays G)
              patchData[idx + 2] = patch.floatPtr(h)[w * 3]; // B channel (was R)
            }
          }
          const patchTensor = new ort.Tensor(patchData, [
            1,
            patchSize,
            patchSize,
            3,
          ]);

          // Run inference on patch
          const patchOutput = await this.model.run({ input_1: patchTensor });
          const patchPrediction = patchOutput.conv2d_12.data as Float32Array;

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

          // Clean up patch resources
          patch.delete();
        }

        // Concatenate patches horizontally for this row
        if (rowPatches.length > 0) {
          // Create a MatVector for hconcat
          const matVector = new cv.MatVector();
          rowPatches.forEach(mat => matVector.push_back(mat));

          const rowMat = new cv.Mat();
          cv.hconcat(matVector, rowMat);

          prediction.push(rowMat);
        }
      }

      // Concatenate all rows vertically
      const finalMatVector = new cv.MatVector();
      prediction.forEach(mat => finalMatVector.push_back(mat));

      const finalMat = new cv.Mat();
      cv.vconcat(finalMatVector, finalMat);

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

      originalImage.delete();
      paddedImage.delete();
      croppedPrediction.delete();
      // Post-processing timing
      const results = await this.postProcessor(
        finalMat,
        geoRawImage,
        confidenceThreshold as number,
        minArea as number
      );
      const inferenceEndTime = performance.now();
      console.log(
        `[building-footprint-segmentagtion] inference completed. Time taken: ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`
      );

      return results;
    } catch (error) {
      // Clean up resources in case of error
      originalImage.delete();
      paddedImage.delete();
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
