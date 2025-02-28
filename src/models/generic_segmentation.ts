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

  async segment(
    polygon: GeoJSON.Feature,
    input_points: any
  ): Promise<SegmentationResult> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    // Double-check data provider after initialization
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
      input_points = [
        [geoRawImage.worldToPixel(input_points[0], input_points[1])],
      ];
      const inputs = await this.processor(geoRawImage as RawImage, {
        input_points,
      });
      outputs = await this.model(inputs);
      masks = await this.processor.post_process_masks(
        outputs.pred_masks,
        inputs.original_sizes,
        inputs.reshaped_input_sizes
      );
    } catch (e) {
      console.error(e);
      throw new Error("Failed to segment image");
    }
    const geoJsonMask = maskToGeoJSON(
      {
        mask: masks,
        scores: outputs.iou_scores.data,
      },
      geoRawImage
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
