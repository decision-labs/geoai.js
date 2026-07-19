import { Mapbox } from "@/data_providers/mapbox";
import { Geobase } from "@/data_providers/geobase";
import { Esri } from "@/data_providers/esri";
import { Tms } from "@/data_providers/tms";
import { Wms } from "@/data_providers/wms";
import { Oam } from "@/data_providers/oam";
import { GoogleMaps } from "@/data_providers/google";
import { ProviderParams } from "@/geoai";
import { PretrainedModelOptions } from "@huggingface/transformers";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { InferenceParams } from "@/core/types";

export abstract class BaseModel {
  protected static instance: BaseModel | null = null;
  protected providerParams: ProviderParams;
  protected dataProvider:
    | Mapbox
    | Geobase
    | Esri
    | Tms
    | Wms
    | Oam
    | GoogleMaps
    | undefined;
  protected model_id: string;
  protected initialized: boolean = false;
  protected modelParams?: PretrainedModelOptions;

  protected constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedModelOptions
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
      case "esri":
        this.dataProvider = new Esri({
          serviceUrl: this.providerParams.serviceUrl,
          serviceName: this.providerParams.serviceName,
          tileSize: this.providerParams.tileSize,
          attribution: this.providerParams.attribution,
        });
        break;
      case "tms":
        this.dataProvider = new Tms({
          baseUrl: this.providerParams.baseUrl,
          extension: this.providerParams.extension,
          apiKey: this.providerParams.apiKey,
          attribution: this.providerParams.attribution,
          tileSize: this.providerParams.tileSize,
          headers: this.providerParams.headers,
          scheme: this.providerParams.scheme,
        });
        break;
      case "wms":
        this.dataProvider = new Wms({
          baseUrl: this.providerParams.baseUrl,
          layers: this.providerParams.layers,
          version: this.providerParams.version,
          crs: this.providerParams.crs,
          format: this.providerParams.format,
          styles: this.providerParams.styles,
          transparent: this.providerParams.transparent,
          attribution: this.providerParams.attribution,
          tileSize: this.providerParams.tileSize,
          headers: this.providerParams.headers,
          extraParams: this.providerParams.extraParams,
        });
        break;
      case "oam":
        this.dataProvider = new Oam({
          stacUrl: this.providerParams.stacUrl,
          rasterUrl: this.providerParams.rasterUrl,
          collection: this.providerParams.collection,
          asset: this.providerParams.asset,
          itemId: this.providerParams.itemId,
          mosaic: this.providerParams.mosaic,
          attribution: this.providerParams.attribution,
          tileSize: this.providerParams.tileSize,
          headers: this.providerParams.headers,
        });
        break;
      case "google":
        this.dataProvider = new GoogleMaps({
          apiKey: this.providerParams.apiKey,
          mapType: this.providerParams.mapType,
          language: this.providerParams.language,
          region: this.providerParams.region,
          sessionToken: this.providerParams.sessionToken,
          tileApiUrl: this.providerParams.tileApiUrl,
          includeApiKey: this.providerParams.includeApiKey,
          attribution: this.providerParams.attribution,
          tileSize: this.providerParams.tileSize,
          headers: this.providerParams.headers,
        });
        break;
      case "sentinel":
        throw new Error("Sentinel provider not implemented yet");
      default:
        throw new Error(
          `Unknown provider: ${(this.providerParams as ProviderParams).provider}`
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
    requiresSquare: boolean = true,
    stitch = true
  ): Promise<GeoRawImage | GeoRawImage[][]> {
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }
    console.log("Converting polygon to image...");
    return this.dataProvider.getImage(
      polygon,
      bands,
      expression,
      zoomLevel,
      requiresSquare,
      stitch
    );
  }

  // Abstract method that must be implemented by child classes
  protected abstract initializeModel(): Promise<void>;

  // Abstract method for model-specific inference
  public abstract inference(params: InferenceParams): Promise<unknown>;
}
