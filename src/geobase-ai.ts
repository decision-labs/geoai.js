// TODO models to incorporate
// https://huggingface.co/models?other=zero-shot-object-detection&library=transformers.js
// https://huggingface.co/models?pipeline_tag=zero-shot-image-classification&library=transformers.js

import { PretrainedOptions } from "@huggingface/transformers";
import { ModelConfig, ModelsInstances, ProviderParams } from "./core/types";
import { modelRegistry } from "./registry";

class Pipeline {
  static async pipeline(
    task: string,
    params: ProviderParams,
    modelId?: string,
    modelParams?: PretrainedOptions
  ): Promise<{ instance: ModelsInstances }> {
    const config = modelRegistry.find(model => model.task === task);

    if (!config) {
      throw new Error(`Model for task ${task} not found`);
    }

    return config.geobase_ai_pipeline(
      params,
      modelId || config.defaultModelId,
      modelParams || config.modelParams
    );
  }

  static async chain(
    tasks: string[],
    params: ProviderParams,
    modelIds?: (string | undefined)[],
    modelParams?: (PretrainedOptions | undefined)[]
  ) {
    const pipelines: { instance: ModelsInstances }[] = [];
    for (let i = 0; i < tasks.length; i++) {
      const pipeline = await Pipeline.pipeline(
        tasks[i],
        params,
        modelIds?.[i],
        modelParams?.[i]
      );
      pipelines.push(pipeline);
    }
    return {
      async run(input: any) {
        let output = input;
        for (const pipeline of pipelines) {
          output = await pipeline.instance.inference(output);
        }
        return output;
      },
      pipelines,
    };
  }

  static listTasks(): string[] {
    return modelRegistry.map(model => model.task);
  }

  static listModels(): ModelConfig[] {
    return modelRegistry;
  }

  static listDomains(): string[] {
    return ["geospatial", "computer-vision", "remote-sensing"];
  }
}

const geobaseAi = {
  pipeline: Pipeline.pipeline,
  chain: Pipeline.chain,
  listTasks: Pipeline.listTasks,
  listModels: Pipeline.listModels,
  listDomains: Pipeline.listDomains,
};

export { geobaseAi, type ProviderParams };
