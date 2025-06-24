import {
  SamModel,
  AutoProcessor,
  RawImage,
  SamProcessor,
} from "@huggingface/transformers";
import { maskToGeoJSON, parametersChanged } from "@/utils/utils";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { ProviderParams } from "@/geobase-ai";
import { PretrainedOptions } from "@huggingface/transformers";
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

export class GenericSegmentation extends BaseModel {
  protected static instance: GenericSegmentation | null = null;
  private model: SamModel | undefined;
  private processor: SamProcessor | undefined;

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
  ): Promise<{ instance: GenericSegmentation }> {
    if (
      !GenericSegmentation.instance ||
      parametersChanged(
        GenericSegmentation.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      GenericSegmentation.instance = new GenericSegmentation(
        model_id,
        providerParams,
        modelParams
      );
      await GenericSegmentation.instance.initialize();
    }
    return { instance: GenericSegmentation.instance };
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

    const geoRawImage: GeoRawImage = isChained
      ? (input as ObjectDetectionResults).geoRawImage
      : await this.polygonToImage(
          polygon,
          mapSourceParams?.zoomLevel,
          mapSourceParams?.bands,
          mapSourceParams?.expression
        );

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

    // Process each input in the batch
    const processedInputs = await Promise.all(
      batch_input.map(async input => {
        let processorInput;
        switch ((input as SegmentationInput).type) {
          case "points": {
            const [x, y] = (input as SegmentationInput).coordinates;
            const processedInput = [[geoRawImage.worldToPixel(x, y)]];
            processorInput = { input_points: processedInput };
            break;
          }
          case "boxes": {
            const [x1, y1, x2, y2] = (input as SegmentationInput).coordinates;
            const corner1 = geoRawImage.worldToPixel(x1, y1);
            const corner2 = geoRawImage.worldToPixel(x2, y2);
            const processedInput = [[[...corner1, ...corner2]]];
            processorInput = { input_boxes: processedInput };
            break;
          }
          default:
            throw new Error(
              `Unsupported input type: ${(input as SegmentationInput).type}`
            );
        }
        // Process the input using the processor
        return this.processor!(geoRawImage as RawImage, processorInput);
      })
    );
    // Run the model on each processed input
    const outputsArray = await Promise.all(
      processedInputs.map(inputs => this.model!(inputs))
    );
    // Post-process the masks for each output
    const masksArray = await Promise.all(
      outputsArray.map((outputs, index) =>
        this.processor!.post_process_masks(
          outputs.pred_masks,
          processedInputs[index].original_sizes,
          processedInputs[index].reshaped_input_sizes
        )
      )
    );

    // Convert masks to GeoJSON
    const geoJsonMasks = masksArray.map((masks, index) => {
      const maskGeo = maskToGeoJSON(
        {
          mask: masks,
          scores: outputsArray[index].iou_scores.data,
        },
        geoRawImage,
        maxMasks as number
      );
      return maskGeo;
    });
    // Combine all masks into a single GeoJSON FeatureCollection
    const combinedMasks: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: geoJsonMasks.flatMap(geoJsonMask => geoJsonMask.features),
    };
    // Return the combined masks and the raw image
    return {
      masks: combinedMasks,
      geoRawImage: geoRawImage,
    };
  }
}
