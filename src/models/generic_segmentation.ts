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

export interface SegmentationInput {
  type: "points" | "boxes";
  coordinates: number[]; // [x, y] for points or [x1, y1, x2, y2] for boxes
}

interface SegmentationResult {
  masks: GeoJSON.FeatureCollection;
  geoRawImage: GeoRawImage;
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
   * @param input - Segmentation input parameters containing either points or boxes coordinates
   *                - For points: Single coordinate pair [x, y]
   *                - For boxes: Two coordinate pairs defining opposite corners [x1, y1, x2, y2]
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
  async segment(
    polygon: GeoJSON.Feature,
    input: SegmentationInput,
    maxMasks: number = 1
  ): Promise<SegmentationResult> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    const geoRawImage = await this.polygon_to_image(polygon);

    let masks;
    let outputs;
    try {
      if (!this.processor || !this.model) {
        throw new Error("Model or processor not initialized");
      }

      let processorInput;

      switch (input.type) {
        case "points": {
          const [x, y] = input.coordinates;
          const processedInput = [[geoRawImage.worldToPixel(x, y)]];
          processorInput = { input_points: processedInput };
          break;
        }

        case "boxes": {
          const [x1, y1, x2, y2] = input.coordinates;
          const corner1 = geoRawImage.worldToPixel(x1, y1);
          const corner2 = geoRawImage.worldToPixel(x2, y2);
          const processedInput = [[[...corner1, ...corner2]]];
          processorInput = { input_boxes: processedInput };
          break;
        }

        default:
          throw new Error(`Unsupported input type: ${input.type}`);
      }

      const inputs = await this.processor(
        geoRawImage as RawImage,
        processorInput
      );
      outputs = await this.model(inputs);
      masks = await this.processor.post_process_masks(
        outputs.pred_masks,
        inputs.original_sizes,
        inputs.reshaped_input_sizes
      );
    } catch (e) {
      console.error(e);
      throw new Error(`Failed to segment image: ${e}`);
    }

    const geoJsonMask = maskToGeoJSON(
      {
        mask: masks,
        scores: outputs.iou_scores.data,
      },
      geoRawImage,
      maxMasks
    );

    return {
      masks: geoJsonMask,
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
