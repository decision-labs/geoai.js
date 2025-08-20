import { pipeline, RawImage, matmul } from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";
import { ProviderParams } from "@/geoai";
import { PretrainedModelOptions } from "@huggingface/transformers";
import { BaseModel } from "./base_model";
import { InferenceParams, ImageFeatureExtractionResults } from "@/core/types";

export class ImageFeatureExtraction extends BaseModel {
  protected static instance: ImageFeatureExtraction | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractor: any | undefined;
  private patchSize: number | undefined;

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
  ): Promise<{ instance: ImageFeatureExtraction }> {
    if (
      !ImageFeatureExtraction.instance ||
      parametersChanged(
        ImageFeatureExtraction.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      ImageFeatureExtraction.instance = new ImageFeatureExtraction(
        model_id,
        providerParams,
        modelParams
      );
      await ImageFeatureExtraction.instance.initialize();
    }
    return { instance: ImageFeatureExtraction.instance };
  }

  protected async initializeModel(): Promise<void> {
    // Initialize the DINOv3 feature extractor
    this.extractor = await pipeline(
      "image-feature-extraction",
      this.model_id,
      this.modelParams
    );

    // Configure the processor to not resize images
    this.extractor.processor.image_processor.do_resize = false;

    // Get patch size from model config
    this.patchSize = this.extractor.model.config.patch_size;
  }

  /**
   * Performs image feature extraction on a geographic area specified by a GeoJSON polygon.
   * Extracts dense feature representations using DINOv3 and computes patch-to-patch similarities.
   *
   * @param params - Inference parameters containing polygon and processing options
   * @returns Promise<ImageFeatureExtractionResults> containing feature vectors, similarity matrix, and metadata
   * @throws {Error} If data provider, model or processor are not properly initialized
   */
  async inference(
    params: InferenceParams
  ): Promise<ImageFeatureExtractionResults> {
    const {
      inputs: { polygon },
      postProcessingParams: { similarityThreshold = 0.5 } = {},
      mapSourceParams,
    } = params;

    if (!polygon) {
      throw new Error("Polygon input is required for feature extraction");
    }

    if (!polygon.geometry || polygon.geometry.type !== "Polygon") {
      throw new Error("Input must be a valid GeoJSON Polygon feature");
    }

    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.extractor || !this.patchSize) {
      throw new Error("Feature extractor not properly initialized");
    }

    const geoRawImage = await this.polygonToImage(
      polygon,
      mapSourceParams?.zoomLevel,
      mapSourceParams?.bands,
      mapSourceParams?.expression
    );

    const inferenceStartTime = performance.now();
    console.log("[image-feature-extraction] starting inference...");

    try {
      // Extract features using DINOv3
      const features = await this.extractor(geoRawImage as RawImage, {
        pooling: "none",
      });

      // Get number of register tokens (if any)
      const numRegisterTokens =
        this.extractor.model.config.num_register_tokens ?? 0;
      const startIndex = 1 + numRegisterTokens; // Skip CLS token and register tokens

      // Extract patch features (skip CLS and register tokens)
      const patchFeatures = features.slice(null, [startIndex, null]);

      // Normalize features for similarity computation
      const normalizedFeatures = patchFeatures.normalize(2, -1);

      // Compute similarity matrix
      const scores = await matmul(
        normalizedFeatures,
        normalizedFeatures.permute(0, 2, 1)
      );
      const similarityMatrix = (await scores.tolist())[0] as number[][];

      // Extract feature vectors
      const featureVectors = (await patchFeatures.tolist())[0] as number[][];

      // Filter features based on threshold if specified
      let filteredFeatures = featureVectors;
      let filteredSimilarityMatrix = similarityMatrix;

      if ((similarityThreshold as number) > 0) {
        // Find patches with high similarity to any other patch
        const highSimilarityPatches = new Set<number>();
        for (let i = 0; i < similarityMatrix.length; i++) {
          for (let j = 0; j < similarityMatrix[i].length; j++) {
            if (
              i !== j &&
              similarityMatrix[i][j] >= (similarityThreshold as number)
            ) {
              highSimilarityPatches.add(i);
              highSimilarityPatches.add(j);
            }
          }
        }

        const patchIndices = Array.from(highSimilarityPatches).sort(
          (a, b) => a - b
        );
        filteredFeatures = patchIndices.map(i => featureVectors[i]);
        filteredSimilarityMatrix = patchIndices.map(i =>
          patchIndices.map(j => similarityMatrix[i][j])
        );
      }

      const inferenceEndTime = performance.now();
      console.log(
        `[image-feature-extraction] inference completed. Time taken: ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`
      );

      const result = {
        features: filteredFeatures,
        similarityMatrix: filteredSimilarityMatrix,
        patchSize: this.patchSize,
        geoRawImage,
        metadata: {
          numPatches: filteredFeatures.length,
          featureDimensions: filteredFeatures[0]?.length || 0,
          modelId: this.model_id,
        },
      };

      console.log("[image-feature-extraction] Result structure:", {
        featuresLength: result.features.length,
        similarityMatrixLength: result.similarityMatrix.length,
        patchSize: result.patchSize,
        geoRawImageBounds: result.geoRawImage?.getBounds(),
        metadata: result.metadata,
      });

      return result;
    } catch (error) {
      console.error("Feature extraction error:", error);
      throw new Error(
        `Feature extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
