import { Mapbox } from "@/data_providers/mapbox";
import { pipeline, RawImage } from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedOptions } from "@huggingface/transformers";
export type ObjectDectection = {
  label: string;
  score: number;
  box: [number, number, number, number];
};

export interface ObjectDetectionResults {
  detections: Array<ObjectDectection>;
  geoRawImage: GeoRawImage;
}

export class ZeroShotObjectDetection {
  private static instance: ZeroShotObjectDetection | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | undefined;
  private model_id: string;
  private detector: any;
  private modelParams: PretrainedOptions | undefined;

  private initialized: boolean = false;

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
  ): Promise<{ instance: ZeroShotObjectDetection }> {
    if (
      !ZeroShotObjectDetection.instance ||
      parametersChanged(
        ZeroShotObjectDetection.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      ZeroShotObjectDetection.instance = new ZeroShotObjectDetection(
        model_id,
        providerParams,
        modelParams
      );
      await ZeroShotObjectDetection.instance.initialize();
    }
    return { instance: ZeroShotObjectDetection.instance };
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

    this.detector = await pipeline(
      "zero-shot-object-detection",
      this.model_id,
      this.modelParams
    );

    this.initialized = true;
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

  async detection(
    polygon: GeoJSON.Feature,
    text: string | string[]
  ): Promise<ObjectDetectionResults> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    // Double-check data provider after initialization
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    const geoRawImage = await this.polygon_to_image(polygon);

    let outputs;
    try {
      const candidate_labels = Array.isArray(text) ? text : [text];
      outputs = await this.detector(geoRawImage as RawImage, candidate_labels, {
        topk: 4,
        threshold: 0.2,
      });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }
    return {
      detections: outputs,
      geoRawImage,
    };
  }
}
