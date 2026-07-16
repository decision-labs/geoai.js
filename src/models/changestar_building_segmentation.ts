import { PretrainedModelOptions } from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";
import { ProviderParams } from "@/geoai";
import { BaseDenseSegmentationModel } from "@/models/dense_segmentation";

/**
 * ChangeStar ViT-B building segmentation.
 * ONNX I/O: image [1,3,1024,1024] → building_prob [1,1,1024,1024] (sigmoid).
 */
export class ChangeStarBuildingSegmentation extends BaseDenseSegmentationModel {
  protected static instanceRef: ChangeStarBuildingSegmentation | null = null;
  static readonly default_huggingface_id =
    "geobase/changestar-building-segmentation-vitb";

  protected readonly inputName = "image";
  protected readonly outputName = "building_prob";
  protected readonly tileSize = 1024;
  protected readonly tileOverlap = 64;
  protected readonly defaultThreshold = 0.5;

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
  ): Promise<{ instance: ChangeStarBuildingSegmentation }> {
    if (
      !ChangeStarBuildingSegmentation.instanceRef ||
      parametersChanged(
        ChangeStarBuildingSegmentation.instanceRef,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      ChangeStarBuildingSegmentation.instanceRef =
        new ChangeStarBuildingSegmentation(
          model_id,
          providerParams,
          modelParams
        );
      await ChangeStarBuildingSegmentation.instanceRef.initialize();
    }
    return { instance: ChangeStarBuildingSegmentation.instanceRef };
  }
}
