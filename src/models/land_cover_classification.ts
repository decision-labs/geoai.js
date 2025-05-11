import { Mapbox } from "@/data_providers/mapbox";
import { RawImage } from "@huggingface/transformers";
import { parametersChanged, refineMasks } from "@/utils/utils";
const cv = require("@techstark/opencv-js");

import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedOptions } from "@huggingface/transformers";
import { Geobase } from "@/data_providers/geobase";
import * as ort from "onnxruntime-web";

export class LandCoverClassification {
  private static instance: LandCoverClassification | null = null;
  private providerParams: ProviderParams;
  private dataProvider: Mapbox | Geobase | undefined;
  private model_id: string; //model name or path
  private model: ort.InferenceSession | undefined;
  private initialized: boolean = false;
  private classes: string[] = [
    "bareland",
    "rangeland",
    "developed space",
    "road",
    "tree",
    "water",
    "agriculture land",
    "buildings",
  ];
  private colors: number[][] = [
    [128, 0, 0],
    [0, 255, 0],
    [192, 192, 192],
    [255, 255, 255],
    [49, 139, 87],
    [0, 0, 255],
    [127, 255, 0],
    [255, 0, 0],
  ];

  private constructor(model_id: string, providerParams: ProviderParams) {
    this.model_id = model_id;
    this.providerParams = providerParams;
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
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
        providerParams
      );
      await LandCoverClassification.instance.initialize();
    }
    return { instance: LandCoverClassification.instance };
  }

  private async preProcessor(image: GeoRawImage): Promise<any> {
    let rawImage = new RawImage(
      image.data,
      image.height,
      image.width,
      image.channels
    );

    // If image has 4 channels, remove the alpha channel
    if (image.channels > 3) {
      const newData = new Uint8Array(image.width * image.height * 3);
      for (let i = 0, j = 0; i < image.data.length; i += 4, j += 3) {
        newData[j] = image.data[i]; // R
        newData[j + 1] = image.data[i + 1]; // G
        newData[j + 2] = image.data[i + 2]; // B
      }
      rawImage = new RawImage(newData, image.height, image.width, 3);
    }

    // Convert the raw image data to an OpenCV Mat
    let mat = cv.matFromArray(
      rawImage.height,
      rawImage.width,
      rawImage.channels === 4 ? cv.CV_8UC4 : cv.CV_8UC3,
      rawImage.data
    );

    // Resize the image to 1024x1024
    let resizedMat = new cv.Mat();
    let newSize = new cv.Size(1024, 1024);
    cv.resize(mat, resizedMat, newSize, 0, 0, cv.INTER_LINEAR);

    // Convert the resized Mat back to a Uint8Array
    const resizedImageData = new Uint8Array(resizedMat.data);

    // Create a new RawImage object with resized data
    const resizedRawImage = new RawImage(resizedImageData, 1024, 1024, 3);

    console.log("resizedRawImage", { resizedRawImage });

    // Clean up OpenCV Mats
    mat.delete();
    resizedMat.delete();

    let tensor = resizedRawImage.toTensor("CHW");
    const data = tensor.data as Uint8Array;

    // Create a Float32Array to store normalized pixel values
    const floatData = new Float32Array(
      resizedRawImage.width * resizedRawImage.height * 3
    );

    // Normalize pixel values to the range [0, 1]
    for (
      let i = 0;
      i < resizedRawImage.width * resizedRawImage.height * 3;
      i++
    ) {
      floatData[i] = data[i] / 255.0; // Normalize to [0, 1]
    }

    // Normalize (same as PyTorch transforms.Normalize)
    const mean = [0.4325, 0.4483, 0.3879];
    const std = [0.0195, 0.0169, 0.0179];

    // Normalize pixel values
    for (
      let i = 0;
      i < resizedRawImage.width * resizedRawImage.height * 3;
      i++
    ) {
      floatData[i] = (floatData[i] - mean[i % 3]) / std[i % 3];
    }
    // Convert Float32Array to Float32 tensor
    let normal_tensor = new ort.Tensor("float32", floatData, [
      3,
      resizedRawImage.height,
      resizedRawImage.width,
    ]);
    // Add batch dimension (1, C, H, W)
    normal_tensor = normal_tensor.reshape([
      1,
      3,
      resizedRawImage.height,
      resizedRawImage.width,
    ]);

    // Create the ONNX Runtime tensor
    const inputs = { input: normal_tensor };

    return inputs;
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

    const response = await fetch(this.model_id);
    if (!response.ok) {
      throw new Error(`Failed to fetch model from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load model using ONNX Runtime
    this.model = await ort.InferenceSession.create(uint8Array);
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

  /**
   * Performs inference on a geographic polygon using the initialized model.
   *
   * @param polygon - A GeoJSON Feature representing the geographic area to analyze
   * @param minArea - Minimum area threshold for contour detection (in pixels). Default is 20.
   * @returns Promise resolving to an object containing:
   *   - detections: GeoJSON FeatureCollection of detected areas
   *   - binaryMasks: Array of RawImage binary masks for each class
   *   - outputImage: GeoRawImage containing the visualization of classifications
   * @throws Error if model or data provider is not properly initialized
   */
  async inference(
    polygon: GeoJSON.Feature,
    minArea: number = 20
  ): Promise<any> {
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    // Double-check data provider after initialization
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    const geoRawImage = await this.polygon_to_image(polygon);

    const inputs = await this.preProcessor(geoRawImage);
    let outputs;
    try {
      if (!this.model) {
        throw new Error("Model or processor not initialized");
      }
      outputs = await this.model.run(inputs);
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    const output = outputs.output; // Extract first tensor

    const squeezedOutput = output.data as Float32Array;
    const [batch, channels, height, width] = output.dims;

    if (batch !== 1) throw new Error("Unexpected batch size");

    // Initialize argmax output (512 x 512)
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
      minArea
    );
    // Assign color to each pixel based on class index
    for (let i = 0; i < height * width; i++) {
      const classIndex = argmaxOutput[i];
      const color = this.colors[classIndex];
      const offset = i * 3;
      outputImage[offset] = color[0];
      outputImage[offset + 1] = color[1];
      outputImage[offset + 2] = color[2];
    }

    // Create a new RawImage object with output data
    const outputRawImage = new GeoRawImage(
      outputImage,
      height,
      width,
      3,
      geoRawImage.getBounds()
    );

    return {
      detections: featureCollection,
      binaryMasks,
      outputImage: outputRawImage,
    };
  }
}
