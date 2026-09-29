import {
  AutoModel,
  AutoProcessor,
  RawImage,
  Tensor,
} from "@huggingface/transformers";
import {
  InferenceParams,
  ImageGeolocationResults,
  ProviderParams,
} from "@/core/types";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { parametersChanged } from "@/utils/utils";
import { PretrainedModelOptions } from "@huggingface/transformers";
import { BaseModel } from "./base_model";

const GPS_GALLERY_URL =
  "https://huggingface.co/Xenova/geoclip-large-patch14/resolve/main/gps_gallery/coordinates_100K.json";
const DEFAULT_TOP_K = 5;
const COORDINATE_BATCH_SIZE = 512;
const LOGIT_SCALE = Math.exp(3.681034803390503);

type GeoClipModel = (
  inputs: Record<string, unknown>
) => Promise<Record<string, Tensor>>;

/** Geolocates imagery by comparing its GeoCLIP embedding to a worldwide GPS gallery. */
export class ImageGeolocation extends BaseModel {
  protected static instance: ImageGeolocation | null = null;
  private visionModel: GeoClipModel | undefined;
  private locationModel: GeoClipModel | undefined;
  private processor:
    | Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>
    | undefined;
  private gpsGallery: [number, number][] | undefined;

  private constructor(
    modelId: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedModelOptions
  ) {
    super(modelId, providerParams, modelParams);
  }

  static async getInstance(
    modelId: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedModelOptions
  ): Promise<{ instance: ImageGeolocation }> {
    if (
      !ImageGeolocation.instance ||
      parametersChanged(
        ImageGeolocation.instance,
        modelId,
        providerParams,
        modelParams
      )
    ) {
      ImageGeolocation.instance = new ImageGeolocation(
        modelId,
        providerParams,
        modelParams
      );
      await ImageGeolocation.instance.initialize();
    }
    return { instance: ImageGeolocation.instance };
  }

  protected async initializeModel(): Promise<void> {
    // GeoCLIP's vision encoder is loaded with Q4 weights; its location encoder
    // remains fp32, as required by the publisher's reference implementation.
    this.visionModel = (await AutoModel.from_pretrained(this.model_id, {
      ...this.modelParams,
      model_file_name: "vision_model",
    })) as unknown as GeoClipModel;
    this.locationModel = (await AutoModel.from_pretrained(this.model_id, {
      model_file_name: "location_model",
      dtype: "fp32",
      device: this.modelParams?.device,
    })) as unknown as GeoClipModel;
    this.processor = await AutoProcessor.from_pretrained(
      "openai/clip-vit-large-patch14"
    );
  }

  private async getGpsGallery(): Promise<[number, number][]> {
    if (!this.gpsGallery) {
      const response = await fetch(GPS_GALLERY_URL);
      if (!response.ok)
        throw new Error(
          `Unable to load GeoCLIP's GPS gallery (${response.status})`
        );
      this.gpsGallery = (await response.json()) as [number, number][];
    }
    return this.gpsGallery;
  }

  async inference(params: InferenceParams): Promise<ImageGeolocationResults> {
    const { polygon, image, topK = DEFAULT_TOP_K } = params.inputs;
    if (
      !(image instanceof Blob) &&
      (!polygon || !polygon.geometry || polygon.geometry.type !== "Polygon")
    ) {
      throw new Error(
        "Provide an uploaded image or a valid GeoJSON Polygon feature for image geolocation"
      );
    }
    if (!this.initialized) await this.initialize();
    if (!this.visionModel || !this.locationModel || !this.processor)
      throw new Error("GeoCLIP model was not initialized");

    const geoRawImage =
      image instanceof Blob
        ? undefined
        : ((await this.polygonToImage(
            polygon!,
            params.mapSourceParams?.zoomLevel,
            params.mapSourceParams?.bands,
            params.mapSourceParams?.expression
          )) as GeoRawImage);
    const inputImage =
      image instanceof Blob
        ? await RawImage.fromBlob(image)
        : (geoRawImage as unknown as RawImage);
    const visionOutput = await this.visionModel(
      await this.processor(inputImage)
    );
    const imageEmbeds = visionOutput.image_embeds;
    if (!imageEmbeds)
      throw new Error("GeoCLIP vision model did not return image embeddings");

    const normalizedImage = imageEmbeds.normalize().data as Float32Array;
    const gallery = await this.getGpsGallery();
    const candidates: {
      index: number;
      gps: [number, number];
      score: number;
    }[] = [];
    for (
      let offset = 0;
      offset < gallery.length;
      offset += COORDINATE_BATCH_SIZE
    ) {
      const coordinates = gallery.slice(offset, offset + COORDINATE_BATCH_SIZE);
      const locationOutput = await this.locationModel({
        location: new Tensor("float32", coordinates.flat(), [
          coordinates.length,
          2,
        ]),
      });
      const locationEmbeds = locationOutput.location_embeds;
      if (!locationEmbeds)
        throw new Error(
          "GeoCLIP location model did not return location embeddings"
        );
      const normalizedLocations = locationEmbeds.normalize()
        .data as Float32Array;
      for (
        let coordinateIndex = 0;
        coordinateIndex < coordinates.length;
        coordinateIndex++
      ) {
        let dotProduct = 0;
        for (
          let dimension = 0;
          dimension < normalizedImage.length;
          dimension++
        ) {
          dotProduct +=
            normalizedImage[dimension] *
            normalizedLocations[
              coordinateIndex * normalizedImage.length + dimension
            ];
        }
        candidates.push({
          index: offset + coordinateIndex,
          gps: coordinates[coordinateIndex],
          score: LOGIT_SCALE * dotProduct,
        });
      }
    }

    // Do not spread the 100k gallery scores into Math.max: browsers cap the
    // number of function arguments and throw a stack overflow for this array.
    const maxScore = candidates.reduce(
      (maximum, candidate) => Math.max(maximum, candidate.score),
      Number.NEGATIVE_INFINITY
    );
    const scoreTotal = candidates.reduce(
      (total, candidate) => total + Math.exp(candidate.score - maxScore),
      0
    );
    const predictions = candidates
      .map(candidate => ({
        ...candidate,
        score: Math.exp(candidate.score - maxScore) / scoreTotal,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.floor(Number(topK) || DEFAULT_TOP_K)));

    return {
      predictions,
      geoRawImage,
      metadata: { modelId: this.model_id, gallerySize: gallery.length },
    };
  }
}
