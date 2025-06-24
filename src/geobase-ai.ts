import { PretrainedOptions } from "@huggingface/transformers";
import {
  ModelConfig,
  ModelInstance,
  ProviderParams,
  SegmentationResults,
  ObjectDetectionResults,
  InferenceParams,
} from "@/core/types";
import { modelRegistry } from "./registry";
import { ZeroShotObjectDetection } from "./models/zero_shot_object_detection";
import { GenericSegmentation } from "./models/generic_segmentation";
import { ObjectDetection } from "./models/object_detection";
import { ErrorType, GeobaseError } from "./errors";

interface ChainInstance {
  inference: (
    inputs: InferenceParams
  ) => Promise<ObjectDetectionResults | SegmentationResults>;
}

class Pipeline {
  /**
   * Builds a dependency graph from modelRegistry chainableTasks
   */
  private static buildTaskGraph(): Record<string, Set<string>> {
    const graph: Record<string, Set<string>> = {};
    for (const model of modelRegistry) {
      graph[model.task] = new Set(model.chainableTasks || []);
    }
    return graph;
  }

  /**
   * Finds all valid task chains using BFS
   */
  public static findValidChains(tasks: string[]): string[][] {
    const graph = Pipeline.buildTaskGraph();
    const validChains: string[][] = [];
    const queue: { chain: string[]; remaining: Set<string> }[] = tasks.map(
      task => ({
        chain: [task],
        remaining: new Set(tasks.filter(t => t !== task)),
      })
    );

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.remaining.size === 0) {
        validChains.push(current.chain);
        continue;
      }

      const lastTask = current.chain[current.chain.length - 1];
      for (const nextTask of current.remaining) {
        if (graph[lastTask]?.has(nextTask)) {
          queue.push({
            chain: [...current.chain, nextTask],
            remaining: new Set(
              [...current.remaining].filter(t => t !== nextTask)
            ),
          });
        }
      }
    }

    return validChains;
  }

  /**
   * Orders tasks in a valid chainable sequence
   */
  private static orderChainTasks(tasks: string[]): string[] {
    const validChains = this.findValidChains(tasks);
    if (validChains.length === 0) {
      throw new Error(
        `Cannot find a valid order for tasks: ${tasks.join(", ")}`
      );
    }
    return validChains[0]; // Return first valid chain
  }

  /**
   * Validates and reorders tasks array in-place
   */
  private static validateChainCompatibility(tasks: string[]): string[] {
    const ordered = this.orderChainTasks(tasks);
    return tasks.splice(0, tasks.length, ...ordered);
  }

  /**
   * Validates input for a specific task
   */
  private static validateTaskInput(task: string, input: any): void {
    const ioConfig = modelRegistry.find(model => model.task === task)?.ioConfig;
    if (!ioConfig?.inputs) return;

    for (const field of ioConfig.inputs) {
      if (!(field in input)) {
        throw new GeobaseError(
          ErrorType.MissingInputField,
          `Task ${task} requires input field '${field}' but it was not provided`
        );
      }
    }
  }

  /**
   * Creates a pipeline for a single task or a chain of tasks
   * @param taskOrTasks Single task or list of tasks to chain
   * @param providerParams Provider parameters
   * @returns A function that takes inputs and returns the output of the last task in the chain
   */
  static async pipeline(
    taskOrTasks: {
      task: string;
      modelId?: string;
      modelParams?: PretrainedOptions;
    }[],
    providerParams: ProviderParams
  ): Promise<ModelInstance | ChainInstance> {
    // Handle single task case
    if (taskOrTasks.length === 1) {
      const config = modelRegistry.find(
        model => model.task === taskOrTasks[0].task
      );

      if (!config) {
        throw new Error(`Model for task ${taskOrTasks} not found`);
      }

      const instance = await config.geobase_ai_pipeline(
        providerParams,
        taskOrTasks[0].modelId,
        taskOrTasks[0].modelParams || config.modelParams
      );
      return instance?.instance as ModelInstance;
    }

    // Handle task chain case
    if (taskOrTasks.length === 0) {
      throw new Error("At least one task must be specified for chaining");
    }

    const taskNames: string[] = taskOrTasks.map(taskObj => taskObj.task);
    // Validate that all tasks exist
    for (const task of taskNames) {
      const config = modelRegistry.find(model => model.task === task);
      if (!config) {
        throw new Error(`Model for task ${task} not found`);
      }
    }

    // Validate chain compatibility
    const validChain = Pipeline.validateChainCompatibility(taskNames);

    const validTaskList = validChain.map(task =>
      taskOrTasks.find(taskObj => taskObj.task === task)
    );

    const pipelines: { instance: ModelInstance; task: string }[] = [];

    for (const taskObj of validTaskList) {
      if (!taskObj) {
        throw new Error(`Task not found in tasksList`);
      }
      const pipeline = await Pipeline.pipeline(
        [
          {
            task: taskObj.task,
            modelId: taskObj.modelId,
            modelParams: taskObj.modelParams,
          },
        ],
        providerParams
      );
      pipelines.push({
        instance: pipeline as ModelInstance,
        task: taskObj.task,
      });
    }

    return {
      async inference(
        params: InferenceParams
      ): Promise<ObjectDetectionResults | SegmentationResults> {
        let currentInput: any = {
          // inferenceInputs: {
          //   inputs: {},
          //   postProcessingParams: {},
          //   mapSourceParams: {},
          // } as InferenceParams,
        };
        for (let i = 0; i < pipelines.length; i++) {
          const { instance, task } = pipelines[i];
          currentInput.inferenceInputs = { ...params };
          try {
            // Validate and transform input
            Pipeline.validateTaskInput(task, currentInput);

            // Execute the task
            switch (task) {
              case "zero-shot-object-detection":
                currentInput = await (
                  instance as ZeroShotObjectDetection
                ).inference({
                  inputs: currentInput.inferenceInputs.inputs,
                  postProcessingParams: {
                    threshold:
                      currentInput.inferenceInputs.postProcessingParams
                        ?.threshold,
                    topk: currentInput.inferenceInputs.postProcessingParams
                      ?.topk,
                  },
                  mapSourceParams: currentInput.inferenceInputs.mapSourceParams,
                });
                break;

              case "mask-generation":
                currentInput = await (
                  instance as GenericSegmentation
                ).inference({
                  inputs: {
                    ...currentInput.inferenceInputs.inputs,
                    input: currentInput,
                  },
                  postProcessingParams: {
                    maxMasks:
                      currentInput.inferenceInputs.postProcessingParams
                        ?.maxMasks,
                  },
                  mapSourceParams: currentInput.inferenceInputs.mapSourceParams,
                });
                break;

              case "object-detection":
                currentInput = await (instance as ObjectDetection).inference({
                  inputs: currentInput.inferenceInputs.inputs,
                  postProcessingParams: {
                    confidence:
                      currentInput.inferenceInputs.postProcessingParams
                        ?.confidence || 0.9,
                  },
                  mapSourceParams: currentInput.inferenceInputs.mapSourceParams,
                });
                break;

              default:
                break;
            }
          } catch (error: any) {
            throw new Error(
              `Failed to run ${task}: ${error?.message || "Unknown error"}`
            );
          }
        }

        return currentInput;
      },
    };
  }

  static listTasks(): string[] {
    return modelRegistry.map(model => model.task);
  }

  static listModels(): ModelConfig[] {
    return modelRegistry;
  }
}

const geobaseAi = {
  pipeline: Pipeline.pipeline,
  tasks: Pipeline.listTasks,
  models: Pipeline.listModels,
  validateChain: Pipeline.findValidChains,
};

export { geobaseAi, type ProviderParams };
