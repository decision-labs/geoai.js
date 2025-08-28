import {
  SamModel,
  AutoProcessor,
  SamProcessor,
  Tensor,
} from "@huggingface/transformers";
import { maskToGeoJSON, parametersChanged, polygonsEqual } from "@/utils/utils";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { ProviderParams } from "@/geoai";
import { PretrainedModelOptions } from "@huggingface/transformers";
import { BaseModel } from "./base_model";
import { InferenceParams, ObjectDetectionResults } from "@/core/types";

export interface SegmentationInput {
  type: "points" | "boxes";
  coordinates: number[]; // [x, y] for points or [x1, y1, x2, y2] for boxes
}

interface SegmentationResult {
  masks: GeoJSON.FeatureCollection;
  geoRawImage: GeoRawImage;
}

const getOppositePoints = (coordinates: number[][]): number[][] => {
  // Validate input
  if (!Array.isArray(coordinates) || coordinates.length < 4) {
    throw new Error("Input must be an array of at least 4 coordinate pairs");
  }

  // The first and last points are typically the same in a closed polygon
  const uniquePoints = coordinates.slice(0, 4);

  // Find min and max for longitude (x) and latitude (y)
  let minLng = uniquePoints[0][0];
  let maxLng = uniquePoints[0][0];
  let minLat = uniquePoints[0][1];
  let maxLat = uniquePoints[0][1];

  for (let i = 1; i < uniquePoints.length; i++) {
    const [lng, lat] = uniquePoints[i];
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  // Return the two opposite corners
  return [
    [minLng, maxLat], // Southwest corner (min longitude, max latitude)
    [maxLng, minLat], // Northeast corner (max longitude, min latitude)
  ];
};

export class MaskGeneration extends BaseModel {
  protected static instance: MaskGeneration | null = null;
  private model: SamModel | undefined;
  private processor: SamProcessor | undefined;

  // Cache for embeddings to avoid recomputation
  private cachedPolygon: GeoJSON.Feature | null = null;
  private cachedEmbeddings: any = null;
  private cachedGeoRawImage: GeoRawImage | null = null;

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
  ): Promise<{ instance: MaskGeneration }> {
    if (
      !MaskGeneration.instance ||
      parametersChanged(
        MaskGeneration.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      MaskGeneration.instance = new MaskGeneration(
        model_id,
        providerParams,
        modelParams
      );
      await MaskGeneration.instance.initialize();
    }
    return { instance: MaskGeneration.instance };
  }

  protected async initializeModel(): Promise<void> {
    // Initialize model components
    this.model = (await SamModel.from_pretrained(
      this.model_id,
      this.modelParams
    )) as SamModel;
    this.processor = (await AutoProcessor.from_pretrained(
      this.model_id,
      {}
    )) as SamProcessor;
  }

  /**
   * Gets or computes image embeddings for the given polygon
   * Uses cached embeddings if polygon hasn't changed
   */
  private async getOrComputeEmbeddings(
    polygon: GeoJSON.Feature,
    geoRawImage?: GeoRawImage,
    zoomLevel?: number,
    bands?: number[],
    expression?: string
  ): Promise<{
    image_embeddings: any;
    geoRawImage: GeoRawImage;
    image_inputs: any;
  }> {
    // Ensure initialization is complete
    if (!this.model || !this.processor) {
      throw new Error("Model or processor not initialized");
    }
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    let image_inputs = null;

    // Check if we can use cached embeddings
    if (
      this.cachedPolygon &&
      this.cachedEmbeddings &&
      this.cachedGeoRawImage &&
      polygonsEqual(this.cachedPolygon, polygon)
    ) {
      image_inputs = await this.processor(this.cachedGeoRawImage);
      console.log("Using cached embeddings for polygon:", polygon);
      return {
        image_embeddings: this.cachedEmbeddings,
        geoRawImage: this.cachedGeoRawImage,
        image_inputs,
      };
    }
    console.log(
      "Cached embeddings not found or polygon changed, recomputing..."
    );

    // Compute new embeddings
    if (!geoRawImage) {
      geoRawImage = (await this.polygonToImage(
        polygon,
        zoomLevel,
        bands,
        expression
      )) as GeoRawImage;
    }
    image_inputs = await this.processor(geoRawImage);
    const image_embeddings =
      await this.model.get_image_embeddings(image_inputs);

    // Cache the results
    this.cachedPolygon = JSON.parse(JSON.stringify(polygon)); // Deep copy
    this.cachedEmbeddings = image_embeddings;
    this.cachedGeoRawImage = geoRawImage;

    return { image_embeddings, geoRawImage, image_inputs };
  }

  /**
   * Performs segmentation on a geographic area based on the provided input parameters.
   *
   * @param params - Inference parameters containing:
   *                - inputs: Object containing polygon and segmentation input
   *                - postProcessingParams: Optional parameters for post-processing
   *                - mapSourceParams: Optional parameters for map source configuration
   *
   * @returns Promise<SegmentationResult> containing:
   *          - masks: GeoJSON representation of the segmentation masks
   *          - geoRawImage: Raw image data with geographic reference
   *
   * @throws {Error} If data provider is not initialized
   * @throws {Error} If model or processor is not initialized
   * @throws {Error} If segmentation process fails
   * @throws {Error} If input type is not supported
   */
  async inference(params: InferenceParams): Promise<SegmentationResult> {
    const {
      inputs: { polygon, input },
      postProcessingParams: { maxMasks = 1 } = {},
      mapSourceParams,
    } = params;

    if (!polygon) {
      throw new Error("Polygon input is required for segmentation");
    }

    if (!polygon.geometry || polygon.geometry.type !== "Polygon") {
      throw new Error("Input must be a valid GeoJSON Polygon feature");
    }

    const isChained =
      (input as ObjectDetectionResults).detections !== undefined;
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    let geoRawImage: GeoRawImage | undefined = isChained
      ? (input as ObjectDetectionResults).geoRawImage
      : undefined;

    const batch_input = isChained
      ? (input as ObjectDetectionResults).detections.features.map(feature => {
          let coordinates: number[][];
          if (
            feature.geometry.type === "Polygon" &&
            Array.isArray(feature.geometry.coordinates)
          ) {
            coordinates = (feature.geometry.coordinates as number[][][])[0];
          } else {
            throw new Error("Geometry type must be Polygon with coordinates");
          }
          if (coordinates.length < 2) {
            throw new Error("Invalid coordinates for bounding box");
          }
          // Get the two opposite corners of the bounding box
          const oppositePoints = getOppositePoints(coordinates);
          const [x1, y1] = [oppositePoints[0][0], oppositePoints[0][1]];
          const [x2, y2] = [oppositePoints[1][0], oppositePoints[1][1]];
          return {
            type: "boxes",
            coordinates: [x1, y1, x2, y2],
          };
        })
      : [input];

    let modelInputs;
    const cachedData = await this.getOrComputeEmbeddings(
      polygon,
      geoRawImage,
      mapSourceParams?.zoomLevel,
      mapSourceParams?.bands,
      mapSourceParams?.expression
    );
    if (!cachedData) {
      throw new Error("Failed to get or compute embeddings");
    }
    geoRawImage = cachedData.geoRawImage;
    const reshaped = cachedData.image_inputs.reshaped_input_sizes[0];
    const inferenceStartTime = performance.now();
    console.log(`[mask-generation] starting inference...`);

    // Process each input in the batch
    const processedInputs = await Promise.all(
      batch_input.map(async input => {
        switch ((input as SegmentationInput).type) {
          case "points": {
            const [x, y] = (input as SegmentationInput).coordinates;
            const pixelCoord = geoRawImage?.worldToPixel(x, y);
            const pixelReshaped = [
              [
                (pixelCoord[0] / geoRawImage?.width) * reshaped[1],
                (pixelCoord[1] / geoRawImage?.height) * reshaped[0],
              ],
            ];
            if (!pixelCoord) {
              throw new Error(
                "Failed to convert world coordinates to pixel coordinates."
              );
            }
            const input_points = new Tensor("float32", pixelReshaped.flat(), [
              1,
              1,
              pixelReshaped.length,
              2,
            ]);
            const labels = [1];
            const input_labels = new Tensor(
              "int64",
              labels.map(l => BigInt(l)),
              [1, 1, labels.length]
            );
            modelInputs = {
              ...cachedData.image_embeddings,
              input_points: input_points,
              input_labels: input_labels,
            };
            break;
          }
          case "boxes": {
            const [x1, y1, x2, y2] = (input as SegmentationInput).coordinates;
            const corner1 = geoRawImage?.worldToPixel(x1, y1);
            const corner1Reshaped = [
              (corner1[0] / geoRawImage?.width) * reshaped[1],
              (corner1[1] / geoRawImage?.height) * reshaped[0],
            ];
            const corner2 = geoRawImage?.worldToPixel(x2, y2);
            const corner2Reshaped = [
              (corner2[0] / geoRawImage?.width) * reshaped[1],
              (corner2[1] / geoRawImage?.height) * reshaped[0],
            ];
            if (!corner1 || !corner2) {
              throw new Error(
                "Failed to convert world coordinates to pixel coordinates."
              );
            }
            // const processedInput = [[[...corner1, ...corner2]]];
            const input_boxes = new Tensor(
              "float32",
              [...corner1Reshaped, ...corner2Reshaped],
              [1, 1, 4]
            );
            modelInputs = {
              ...cachedData.image_embeddings,
              input_boxes: input_boxes,
            };
            break;
          }
          default:
            throw new Error(
              `Unsupported input type: ${(input as SegmentationInput).type}`
            );
        }
        return {
          ...modelInputs,
        };
      })
    );
    // Run the model on each processed input
    let outputsArray: any;
    try {
      outputsArray = await Promise.all(
        processedInputs.map(inputs => this.model!(inputs))
      );
    } catch (error) {
      console.error("Error during inference:", error);
      throw new Error(`Model inference failed: ${error}`);
    }

    // Post-process the masks for each output
    const masksArray = await Promise.all(
      outputsArray.map((outputs: any) => {
        return this.processor!.post_process_masks(
          outputs.pred_masks,
          cachedData.image_inputs.original_sizes,
          cachedData.image_inputs.reshaped_input_sizes
        );
      })
    );

    // Convert masks to GeoJSON
    const geoJsonMasks = masksArray.map((_masks, index) => {
      const numMasks = _masks[0].dims[1];

      const masks = [];

      for (let i = 0; i < numMasks; i++) {
        const maskData = _masks[0].data.slice(
          i * _masks[0].dims[2] * _masks[0].dims[3],
          (i + 1) * _masks[0].dims[2] * _masks[0].dims[3]
        );
        // Binarize the mask at 0.5 threshold
        for (let j = 0; j < maskData.length; j++) {
          maskData[j] = maskData[j] >= 0.5 ? 255 : 0;
        }
        const tensor = new Tensor("uint8", maskData, [
          1,
          1,
          _masks[0].dims[2],
          _masks[0].dims[3],
        ]);
        masks.push(tensor);
      }

      const scores = outputsArray[index].iou_scores.data;
      const sortedMasks = masks
        .map((mask: any, i: number) => ({ mask, score: scores[i] }))
        .sort((a: any, b: any) => b.score - a.score)
        .map((item: any) => item.mask);
      const maskGeo: GeoJSON.FeatureCollection[] = maskToGeoJSON(
        {
          mask: sortedMasks.slice(0, (maxMasks as number) || 1),
          scores: outputsArray[index].iou_scores.data,
        },
        geoRawImage,
        [128]
      );
      const combinedFeatures: GeoJSON.Feature[] = [];
      maskGeo.forEach(mc => {
        combinedFeatures.push(...mc.features);
      });
      const fc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: combinedFeatures,
      };
      return fc;
    });
    // Combine all masks into a single GeoJSON FeatureCollection
    const combinedMasks: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: geoJsonMasks.flatMap(geoJsonMask => geoJsonMask.features),
    };
    const inferenceEndTime = performance.now();
    console.log(
      `[mask-generation] inference completed. Time taken: ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`
    );
    // Return the combined masks and the raw image
    return {
      masks: combinedMasks,
      geoRawImage: geoRawImage,
    };
  }

  async getImageEmbeddings(
    params: InferenceParams
  ): Promise<{ image_embeddings: any; geoRawImage: GeoRawImage }> {
    const { inputs } = params;
    if (!inputs.polygon) {
      throw new Error("Polygon input is required for image embeddings");
    }

    if (
      !inputs.polygon.geometry ||
      inputs.polygon.geometry.type !== "Polygon"
    ) {
      throw new Error("Input must be a valid GeoJSON Polygon feature");
    }

    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    const geoRawImage = (await this.polygonToImage(
      inputs.polygon,
      params.mapSourceParams?.zoomLevel,
      params.mapSourceParams?.bands,
      params.mapSourceParams?.expression
    )) as GeoRawImage;

    if (!geoRawImage) {
      throw new Error("Failed to convert polygon to image");
    }
    if (!this.model || !this.processor) {
      throw new Error("Model or processor not initialized");
    }

    const image_inputs = await this.processor(geoRawImage);

    const image_embeddings =
      await this.model.get_image_embeddings(image_inputs);

    return { image_embeddings, geoRawImage };
  }
}
