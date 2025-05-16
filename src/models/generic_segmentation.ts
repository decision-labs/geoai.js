import { Mapbox } from "@/data_providers/mapbox";
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
import { Geobase } from "@/data_providers/geobase";
import { ObjectDetectionResults } from "./zero_shot_object_detection";

export interface SegmentationInput {
  type: "points" | "boxes";
  coordinates: number[]; // [x, y] for points or [x1, y1, x2, y2] for boxes
}

interface SegmentationResult {
  masks: GeoJSON.FeatureCollection;
  geoRawImage: GeoRawImage;
}

function getOppositePoints(coordinates: number[][]): number[][] {
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
}

export class GenericSegmentation {
  private static instance: GenericSegmentation | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | Geobase | undefined;
  private model_id: string;
  private model: SamModel | undefined;
  private processor: SamProcessor | undefined;
  private initialized: boolean = false;
  private modelParams: PretrainedOptions | undefined;

  private constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ) {
    this.model_id = model_id;
    this.providerParams = providerParams;
    this.modelParams = modelParams;
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

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize data provider first
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

    // Verify data provider was initialized
    if (!this.dataProvider) {
      throw new Error("Failed to initialize data provider");
    }

    // Then initialize model components
    this.model = (await SamModel.from_pretrained(
      this.model_id,
      this.modelParams
    )) as SamModel;
    this.processor = (await AutoProcessor.from_pretrained(
      this.model_id,
      {}
    )) as SamProcessor;

    this.initialized = true;
  }

  /**
   * Performs segmentation on a geographic area based on the provided input parameters.
   *
   * @param polygon - A GeoJSON Feature representing the area to be segmented
   * @param input - Segmentation input parameters containing either points or boxes coordinates or the output of an object detection model.
   *                - For points: Single coordinate pair [x, y]
   *                - For boxes: Two coordinate pairs defining opposite corners [x1, y1, x2, y2]
   *                - For object detection results: An ObjectDetectionResults object containing detections and geoRawImage
   * @param maxMasks - Maximum number of segmentation masks to return (defaults to 1)
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
  async inference(
    polygon: GeoJSON.Feature,
    input: SegmentationInput | ObjectDetectionResults,
    maxMasks: number = 1
  ): Promise<SegmentationResult> {
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
      : await this.polygon_to_image(polygon);

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
        maxMasks
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

  private async polygon_to_image(
    polygon: GeoJSON.Feature
  ): Promise<GeoRawImage> {
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }
    const image = this.dataProvider.getImage(polygon);
    return image;
  }
}
