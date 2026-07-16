import { PretrainedModelOptions } from "@huggingface/transformers";
import { ProviderParams } from "@/geoai";
import { BuildingFootPrintSegmentation } from "@/models/building_footprint_segmentation";
import { ChangeStarBuildingSegmentation } from "@/models/changestar_building_segmentation";

export type BuildingSegmentationInstance =
  | BuildingFootPrintSegmentation
  | ChangeStarBuildingSegmentation;

type BuildingSegmentationFactoryFn = (
  params: ProviderParams,
  modelId: string,
  modelParams?: PretrainedModelOptions
) => Promise<{ instance: BuildingSegmentationInstance }>;

const defaultFactory: BuildingSegmentationFactoryFn = (
  params,
  modelId,
  modelParams
) => BuildingFootPrintSegmentation.getInstance(modelId, params, modelParams);

const changeStarFactory: BuildingSegmentationFactoryFn = (
  params,
  modelId,
  modelParams
) =>
  ChangeStarBuildingSegmentation.getInstance(
    modelId,
    params,
    modelParams ?? { dtype: "fp32" }
  );

/**
 * Resolves the building-footprint segmentation implementation from `modelId`.
 * Throws if `modelId` is not registered.
 */
const buildingSegmentationFactories: Record<
  string,
  BuildingSegmentationFactoryFn
> = {
  [BuildingFootPrintSegmentation.default_huggingface_id]: defaultFactory,
  [ChangeStarBuildingSegmentation.default_huggingface_id]: changeStarFactory,
};

export const BuildingSegmentationFactory = {
  getInstance(
    params: ProviderParams,
    modelId: string = BuildingFootPrintSegmentation.default_huggingface_id,
    modelParams?: PretrainedModelOptions
  ): Promise<{ instance: BuildingSegmentationInstance }> {
    const create = buildingSegmentationFactories[modelId];
    if (!create) {
      const known = Object.keys(buildingSegmentationFactories).join(", ");
      throw new Error(
        `Unknown building segmentation modelId "${modelId}". Known ids: ${known}`
      );
    }
    return create(params, modelId, modelParams);
  },
};
