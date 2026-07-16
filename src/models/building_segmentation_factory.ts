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

const buildingFootprintFactory: BuildingSegmentationFactoryFn = (
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
 * Throws if `modelId` is missing or not registered.
 */
const buildingSegmentationFactories: Record<
  string,
  BuildingSegmentationFactoryFn
> = {
  [BuildingFootPrintSegmentation.default_huggingface_id]:
    buildingFootprintFactory,
  [ChangeStarBuildingSegmentation.default_huggingface_id]: changeStarFactory,
};

export const BuildingSegmentationFactory = {
  get knownModelIds(): string[] {
    return Object.keys(buildingSegmentationFactories);
  },

  getInstance(
    params: ProviderParams,
    modelId: string,
    modelParams?: PretrainedModelOptions
  ): Promise<{ instance: BuildingSegmentationInstance }> {
    const resolvedId = modelId?.trim();
    if (!resolvedId) {
      return Promise.reject(
        new Error(
          `Building segmentation modelId is required. Known ids: ${this.knownModelIds.join(", ")}`
        )
      );
    }

    const create = buildingSegmentationFactories[resolvedId];
    if (!create) {
      return Promise.reject(
        new Error(
          `Unknown building segmentation modelId "${resolvedId}". Known ids: ${this.knownModelIds.join(", ")}`
        )
      );
    }
    return create(params, resolvedId, modelParams);
  },
};
