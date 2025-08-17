import { BaseModel } from "@/models/base_model";
import {
  ImageProcessor,
  PreTrainedModel,
  RawImage,
} from "@huggingface/transformers";
import { parametersChanged, refineMasks } from "@/utils/utils";
import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedModelOptions } from "@huggingface/transformers";
import { InferenceParams, onnxModel } from "@/core/types";

export class LandCoverClassification extends BaseModel {
  protected static instance: LandCoverClassification | null = null;
  private model: onnxModel | undefined;
  private classes: string[] | undefined;
  private colors: number[][] | undefined;
  private processor: ImageProcessor | undefined;

  private constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedModelOptions
  ) {
    super(model_id, providerParams, modelParams);
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedModelOptions
  ): Promise<{ instance: LandCoverClassification }> {
    if (
      !LandCoverClassification.instance ||
      parametersChanged(
        LandCoverClassification.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      LandCoverClassification.instance = new LandCoverClassification(
        model_id,
        providerParams,
        modelParams
      );
      await LandCoverClassification.instance.initialize();
    }
    return { instance: LandCoverClassification.instance };
  }

  protected async initializeModel(): Promise<void> {
    // Only load the model if not already loaded
    if (this.model) return;
    this.processor = await ImageProcessor.from_pretrained(this.model_id);
    const pretrainedModel = await PreTrainedModel.from_pretrained(
      this.model_id,
      this.modelParams
    );
    this.model = pretrainedModel.sessions.model;
    const config = pretrainedModel.config as any;
    if (config.classes === undefined || config.colors === undefined) {
      throw new Error(
        "Model config must include both 'classes' and 'colors' properties for land cover classification."
      );
    }
    this.classes = config.classes;
    this.colors = config.colors;
  }

  async inference(params: InferenceParams): Promise<any> {
    const {
      inputs: { polygon },
      postProcessingParams: { minArea = 20 } = {},
      mapSourceParams,
    } = params;

    if (!polygon) {
      throw new Error("Polygon input is required for segmentation");
    }

    if (!polygon.geometry || polygon.geometry.type !== "Polygon") {
      throw new Error("Input must be a valid GeoJSON Polygon feature");
    }
    // Ensure initialization is complete
    await this.initialize();

    // Double-check data provider after initialization
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    const geoRawImage = await this.polygonToImage(
      polygon,
      mapSourceParams?.zoomLevel,
      mapSourceParams?.bands,
      mapSourceParams?.expression
    );
    const inferenceStartTime = performance.now();
    console.log("[land-cover-classification] starting inference...");
    if (!this.processor) {
      throw new Error("Processor not initialized");
    }
    const inputs = await this.processor(geoRawImage);
    let outputs;
    try {
      if (!this.model) {
        throw new Error("Model or processor not initialized");
      }
      outputs = await this.model.run({ input: inputs.pixel_values });
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    const output = outputs.output; // Extract first tensor

    const squeezedOutput = output.data as Float32Array;
    const [batch, channels, height, width] = output.dims;

    if (batch !== 1) throw new Error("Unexpected batch size");

    // Initialize argmax output (height x width)
    const argmaxOutput = new Uint8Array(height * width);

    // Compute argmax along the channel axis (8 classes)
    for (let i = 0; i < height * width; i++) {
      let maxIndex = 0;
      let maxValue = squeezedOutput[i];

      for (let j = 1; j < channels; j++) {
        const value = squeezedOutput[j * height * width + i];
        if (value > maxValue) {
          maxValue = value;
          maxIndex = j;
        }
      }
      argmaxOutput[i] = maxIndex; // Assign class index with highest probability
    }

    const outputImage = new Uint8Array(height * width * 3);

    // Create a binary mask for each class
    const binaryMasks: RawImage[] = [];
    for (let c = 0; c < channels; c++) {
      const mask = new Uint8Array(height * width);
      for (let i = 0; i < height * width; i++) {
        mask[i] = argmaxOutput[i] === c ? 1 : 0;
      }

      // Save each binary mask as an image
      const maskImage = new Uint8Array(height * width * 3);
      for (let i = 0; i < height * width; i++) {
        const value = mask[i] * 255;
        maskImage[i * 3] = value;
        maskImage[i * 3 + 1] = value;
        maskImage[i * 3 + 2] = value;
      }
      const maskRawImage = new RawImage(maskImage, height, width, 3);
      binaryMasks.push(maskRawImage);
    }

    const featureCollection: GeoJSON.FeatureCollection[] = refineMasks(
      binaryMasks,
      geoRawImage,
      this.classes,
      minArea as number
    );
    // Assign color to each pixel based on class index
    for (let i = 0; i < height * width; i++) {
      const classIndex = argmaxOutput[i];
      const color = this.colors?.[classIndex];
      const offset = i * 3;
      if (color) {
        outputImage[offset] = color[0];
        outputImage[offset + 1] = color[1];
        outputImage[offset + 2] = color[2];
      } else {
        // Fallback to black if color is undefined
        outputImage[offset] = 0;
        outputImage[offset + 1] = 0;
        outputImage[offset + 2] = 0;
      }
    }

    // Create a new RawImage object with output data
    const outputRawImage = new GeoRawImage(
      outputImage,
      height,
      width,
      3,
      geoRawImage.getBounds()
    );

    const inferenceEndTime = performance.now();
    console.log(
      `[land-cover-classification] inference completed. Time taken: ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`
    );
    return {
      detections: featureCollection,
      binaryMasks,
      outputImage: outputRawImage,
    };
  }
}
