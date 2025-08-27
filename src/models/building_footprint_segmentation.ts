import { BaseModel } from "@/models/base_model";
import {
  ImageProcessor,
  PreTrainedModel,
  PretrainedModelOptions,
  RawImage,
} from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";
import { ProviderParams } from "@/geoai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import * as ort from "onnxruntime-web";
import { InferenceParams, ObjectDetectionResults } from "@/core/types";
import { contours } from "d3-contour";
import { polygonArea } from "d3-polygon";

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
      postProcessingParams: { confidenceThreshold = 0.3, minArea = 20 } = {},
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
    const geoRawImage = (await this.polygonToImage(
      polygon,
      mapSourceParams?.zoomLevel,
      mapSourceParams?.bands,
      mapSourceParams?.expression
    )) as GeoRawImage;
    const geoPatches = await geoRawImage.toPatches(patchSize, patchSize);

    const geoPatchesFlat = geoPatches.flat();
    console.log(`Inferencing on ${geoPatchesFlat.length} patches`);

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
      const uint8Data = new Uint8Array(resultAll.conv2d_12.data.length);
      for (let i = 0; i < resultAll.conv2d_12.data.length; i++) {
        uint8Data[i] = Math.min(
          255,
          Math.max(0, (resultAll.conv2d_12.data[i] as any) * 255)
        );
      }
      // dimensions are [batch, height, width, channels = 1]
      const predictionRawImages: RawImage[][] = [];
      const rowSize = geoPatches[0].length; // number of patches per row
      const total = resultAll.conv2d_12.dims[0]; // total patches

      for (let i = 0; i < total; i++) {
        const batchData = uint8Data.subarray(
          i * resultAll.conv2d_12.dims[1] * resultAll.conv2d_12.dims[2],
          (i + 1) * resultAll.conv2d_12.dims[1] * resultAll.conv2d_12.dims[2]
        );

        const rawImage = new RawImage(
          batchData,
          resultAll.conv2d_12.dims[2],
          resultAll.conv2d_12.dims[1],
          1
        );

        // --- put into 2D structure ---
        const row = Math.floor(i / rowSize);
        if (!predictionRawImages[row]) {
          predictionRawImages[row] = [];
        }
        predictionRawImages[row].push(rawImage);
      }
      const stitchedPrediction = GeoRawImage.fromPatches(
        predictionRawImages,
        geoRawImage.getBounds(),
        geoRawImage.getCRS()
      );

      // Post-processing timing
      const results = await this.postProcessor(
        stitchedPrediction,
        confidenceThreshold as number,
        minArea as number
      );
      // croppedPrediction.delete(); // Clean up the cropped Mat
      const inferenceEndTime = performance.now();
      console.log(
        `[building-footprint-segmentagtion] inference completed. Time taken: ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`
      );

      return {
        detections: results,
        geoRawImage,
      };
    } catch (error) {
      throw error;
    }
  }

  protected async postProcessor(
    output: GeoRawImage,
    // geoRawImage: GeoRawImage,
    CONFIDENCE_THRESHOLD: number = 0.1,
    minArea: number = 20
  ): Promise<GeoJSON.FeatureCollection> {
    try {
      if (CONFIDENCE_THRESHOLD > 0 && CONFIDENCE_THRESHOLD < 1) {
        CONFIDENCE_THRESHOLD = Math.floor(CONFIDENCE_THRESHOLD * 255);
      }
      const contourGen = contours()
        .size([output.width, output.height])
        .thresholds([CONFIDENCE_THRESHOLD]);

      const data: number[] = [];
      output.data.forEach((v: number) => {
        data.push(v);
      });
      const generatedContours = contourGen(data);

      const features: GeoJSON.Feature[] = [];

      generatedContours.forEach(contour => {
        contour.coordinates.forEach(polygon => {
          polygon.forEach(ring => {
            if (ring.length < 3) return; // skip invalid rings
            const area = Math.abs(polygonArea(ring as [number, number][]));
            if (area < minArea) return;
            const coordinates = ring.map(coord =>
              output.pixelToWorld(coord[0], coord[1])
            );
            features.push({
              type: "Feature",
              properties: {
                // confidence: 1.0,
              },
              geometry: {
                type: "Polygon",
                coordinates: [coordinates],
              },
            });
          });
        });
      });

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features,
      };
      return geojson;
    } catch (error) {
      console.error("Error processing contours:", error);
      throw error;
    }
  }
}
