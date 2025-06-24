import { Mapbox } from "@/data_providers/mapbox";
import { Geobase } from "@/data_providers/geobase";
import { ProviderParams } from "@/geobase-ai";
import { PretrainedOptions } from "@huggingface/transformers";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { InferenceParams } from "@/core/types";

export abstract class BaseModel {
  protected static instance: BaseModel | null = null;
  protected providerParams: ProviderParams;
  protected dataProvider: Mapbox | Geobase | undefined;
  protected model_id: string;
  protected initialized: boolean = false;
  protected modelParams?: PretrainedOptions;

  protected constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ) {
    this.model_id = model_id;
    this.providerParams = providerParams;
    this.modelParams = modelParams;
  }

  protected async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize data provider
    this.initializeDataProvider();

    // Verify data provider was initialized
    if (!this.dataProvider) {
      throw new Error("Failed to initialize data provider");
    }

    // Initialize model-specific components
    await this.initializeModel();
    this.initialized = true;
  }

  protected initializeDataProvider(): void {
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
  }

  /**
   * Converts a GeoJSON polygon feature into a GeoRawImage using the configured data provider.
   *
   * @param polygon - The GeoJSON Feature representing the area of interest.
   * @param zoomLevel - (Optional) The zoom level to use when retrieving the image.
   * @param bands - (Optional) An array of band indices to select specific bands from the imagery.
   * @param expression - (Optional) A string expression to apply to the image bands (e.g., for band math).
   * @param requiresSquare - (default false) Whether to return a square image.
   * @returns A Promise that resolves to a GeoRawImage corresponding to the input polygon.
   * @throws {Error} If the data provider is not initialized.
   */
  protected async polygonToImage(
    polygon: GeoJSON.Feature,
    zoomLevel?: number,
    bands?: number[],
    expression?: string,
    requiresSquare: boolean = false
  ): Promise<GeoRawImage> {
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }
    return this.dataProvider.getImage(
      polygon,
      bands,
      expression,
      zoomLevel,
      requiresSquare
    );
  }

  // Abstract method that must be implemented by child classes
  protected abstract initializeModel(): Promise<void>;

  // Abstract method for model-specific inference
  public abstract inference(params: InferenceParams): Promise<unknown>;
}
