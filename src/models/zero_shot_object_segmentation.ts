import { Mapbox } from "@/data_providers/mapbox";
import { parametersChanged } from "@/utils/utils";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedOptions } from "@huggingface/transformers";
import { Geobase } from "@/data_providers/geobase";
import { ZeroShotObjectDetection } from "./zero_shot_object_detection";
import { GenericSegmentation } from "./generic_segmentation";

// TODO: move this to utils later or find a thirdparty geojson validator
// ============================================
/**
 * Type guard to check if a GeoJSON Feature has a valid polygon geometry.
 */
export function isValidPolygonFeature(
  feature: GeoJSON.Feature
): feature is GeoJSON.Feature<GeoJSON.Geometry> {
  const geom = feature.geometry;
  if (!geom || geom.type === "GeometryCollection") return false;
  if (!("coordinates" in geom)) return false;

  const coords = geom.coordinates;
  return (
    Array.isArray(coords) &&
    coords.length > 0 &&
    Array.isArray(coords[0]) &&
    coords[0].length > 0 &&
    coords[0].some(coord => Array.isArray(coord) && coord.length > 0)
  );
}
// ==================================================================

export interface SegmentationResults {
  detections: GeoJSON.FeatureCollection;
  masks: GeoJSON.FeatureCollection;
  geoRawImage: GeoRawImage;
  rawDetections: any[];
}

export class ZeroShotObjectSegmentation {
  private static instance: ZeroShotObjectSegmentation | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | Geobase | undefined;
  // TODO: Good first version, in future let's refactor this to create a meta class that either accepts array of model parameters to chain or has a method called `compose` or `chain` that accepts models to chain together.
  private detector_id: string = "onnx-community/grounding-dino-tiny-ONNX";
  private segmenter_id: string = "Xenova/slimsam-77-uniform";
  private detector: ZeroShotObjectDetection | undefined;
  private segmenter: GenericSegmentation | undefined;
  private modelParams:
    | (PretrainedOptions & {
        detector_id?: string;
        segmenter_id?: string;
      })
    | undefined;

  private initialized: boolean = false;

  private constructor(
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ) {
    this.providerParams = providerParams;
    this.modelParams = modelParams;
  }

  static async getInstance(
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions,
    model_id?: string // TODO: to be removed when pipeline api is updated as this model is chaining of two models so this is not required
  ): Promise<{ instance: ZeroShotObjectSegmentation }> {
    console.info({ model_id }); //To avoid build error, remove this line when pipeline api is updated
    const _instance = ZeroShotObjectSegmentation.instance;
    if (
      !_instance ||
      parametersChanged(_instance, "", providerParams, modelParams)
    ) {
      ZeroShotObjectSegmentation.instance = new ZeroShotObjectSegmentation(
        providerParams,
        modelParams
      );
      await ZeroShotObjectSegmentation.instance.initialize();
    }
    return { instance: ZeroShotObjectSegmentation.instance! };
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

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

    if (!this.dataProvider) {
      throw new Error("Failed to initialize data provider");
    }

    // Model 1: Initialize detector using existing ZeroShotObjectDetection
    const { instance: detectorInstance } =
      await ZeroShotObjectDetection.getInstance(
        this.modelParams?.detector_id || this.detector_id,
        this.providerParams,
        this.modelParams
      );
    this.detector = detectorInstance;

    // Model 2: Initialize segmenter using GenericSegmentation
    const { instance: segmenterInstance } =
      await GenericSegmentation.getInstance(
        this.modelParams?.segmenter_id || this.segmenter_id,
        this.providerParams,
        {
          ...this.modelParams,
          revision: "boxes",
        }
      );
    this.segmenter = segmenterInstance;

    this.initialized = true;
  }

  async detect_and_segment(
    polygon: GeoJSON.Feature,
    text: string | string[]
  ): Promise<SegmentationResults> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.detector || !this.segmenter) {
      throw new Error("Detector or segmenter not initialized");
    }

    // Use existing detection method
    const detectionResults = await this.detector.detection(polygon, text);
    const { geoRawImage } = detectionResults;
    const rawDetections = this.detector?.rawDetections;
    if (!rawDetections) {
      throw new Error("No raw detections found");
    }

    // Then segment each detection using GenericSegmentation
    let masks: GeoJSON.Feature[] = [];
    for (const detection of rawDetections) {
      const bbox = detection.box;
      const corner1 = geoRawImage.pixelToWorld(bbox.xmin, bbox.ymin);
      const corner2 = geoRawImage.pixelToWorld(bbox.xmax, bbox.ymax);
      const segmentationInput = {
        type: "boxes" as const,
        coordinates: [...corner1, ...corner2],
      };

      const segmentationResult = await this.segmenter.segment(
        polygon,
        segmentationInput
      );

      const validFeatures = segmentationResult.masks.features.filter(
        isValidPolygonFeature
      );

      masks.push(...validFeatures);
    }

    // Combine all masks into a single FeatureCollection
    const masksGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: masks,
    };

    return {
      detections: detectionResults.detections,
      masks: masksGeoJson,
      geoRawImage,
      rawDetections,
    };
  }
}
