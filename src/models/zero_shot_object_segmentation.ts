import { Mapbox } from "@/data_providers/mapbox";
import {
  pipeline,
  RawImage,
  SamModel,
  AutoProcessor,
} from "@huggingface/transformers";
import {
  detectionsToGeoJSON,
  maskToGeoJSON,
  parametersChanged,
} from "@/utils/utils";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedOptions } from "@huggingface/transformers";
import { Geobase } from "@/data_providers/geobase";

export interface SegmentationResults {
  detections: GeoJSON.FeatureCollection;
  masks: GeoJSON.FeatureCollection;
  geoRawImage: GeoRawImage;
}

export class ZeroShotObjectSegmentation {
  private static instance: ZeroShotObjectSegmentation | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | Geobase | undefined;
  private detector_id: string = "onnx-community/grounding-dino-tiny-ONNX";
  private segmenter_id: string = "Xenova/slimsam-77-uniform";
  private detector: any;
  private segmenter: SamModel | undefined;
  private processor: any;
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
    console.log({ model_id });
    if (
      !ZeroShotObjectSegmentation.instance ||
      parametersChanged(
        ZeroShotObjectSegmentation.instance,
        "",
        providerParams,
        modelParams
      )
    ) {
      ZeroShotObjectSegmentation.instance = new ZeroShotObjectSegmentation(
        providerParams,
        modelParams
      );
      await ZeroShotObjectSegmentation.instance.initialize();
    }
    return { instance: ZeroShotObjectSegmentation.instance };
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

    // Initialize both models
    this.detector = await pipeline(
      "zero-shot-object-detection",
      this.modelParams?.detector_id || this.detector_id,
      this.modelParams
    );

    this.segmenter = (await SamModel.from_pretrained(
      this.modelParams?.segmenter_id || this.segmenter_id,
      {
        revision: "boxes",
      }
    )) as SamModel;

    this.processor = await AutoProcessor.from_pretrained(this.segmenter_id, {});

    this.initialized = true;
  }

  private async polygon_to_image(
    polygon: GeoJSON.Feature
  ): Promise<GeoRawImage> {
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }
    return this.dataProvider.getImage(polygon);
  }

  async detect_and_segment(
    polygon: GeoJSON.Feature,
    text: string | string[]
  ): Promise<SegmentationResults> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    const geoRawImage = await this.polygon_to_image(polygon);
    geoRawImage.save("zero-segmentation.png");

    // First detect objects
    const candidate_labels = Array.isArray(text) ? text : [text];
    const detections = await this.detector(
      geoRawImage as RawImage,
      candidate_labels,
      {
        topk: 4,
        threshold: 0.2,
      }
    );

    // Then segment each detection
    let masks: any[] = [];
    for (const detection of detections) {
      const bbox = detection.box;
      const minx = bbox.xmin;
      const miny = bbox.ymin;
      const maxx = bbox.xmax;
      const maxy = bbox.ymax;

      const inputs = await this.processor(geoRawImage as RawImage, {
        input_boxes: [[[minx, miny, maxx, maxy]]],
      });

      const outputs = await this.segmenter!(inputs);
      const segmentation_masks = await this.processor.post_process_masks(
        outputs.pred_masks,
        inputs.original_sizes,
        inputs.reshaped_input_sizes
      );

      masks.push({
        mask: segmentation_masks,
        scores: outputs.iou_scores.data,
      });
    }

    const detectionsGeoJson = detectionsToGeoJSON(detections, geoRawImage);

    const masksGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: masks.flatMap(
        mask => maskToGeoJSON(mask, geoRawImage).features
      ),
    };

    return {
      detections: detectionsGeoJson,
      masks: masksGeoJson,
      geoRawImage,
    };
  }
}
