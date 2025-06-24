import { geoai } from "./index";
import { ProviderParams } from "./geobase-ai";
import {
  AutoTokenizer,
  AutoModelForSequenceClassification,
} from "@huggingface/transformers";

// const model_id = 'jinaai/jina-reranker-v1-tiny-en';
const model_id = "Xenova/ms-marco-TinyBERT-L-2-v2";
const model = await AutoModelForSequenceClassification.from_pretrained(
  model_id,
  { model_file_name: "model_quantized" }
);
const tokenizer = await AutoTokenizer.from_pretrained(model_id);

/**
 * Parses user queries and determines which geospatial AI task(s) to run.
 */
async function parseQuery(userQuery: string) {
  const tasks = geoai.tasks();
  const inputs = tokenizer(new Array(tasks.length).fill(userQuery), {
    text_pair: tasks,
    padding: true,
    truncation: true,
  });
  const { logits } = await model(inputs);
  const bestTaskIndex = logits.argmax().item();
  return tasks[bestTaskIndex];
}

/**
 * Runs the selected geospatial task in the AI pipeline.
 */
async function queryAgent(userQuery: string, providerParams: ProviderParams) {
  const task = await parseQuery(userQuery);

  const model = geoai.models().find(m => m.task === task);
  if (!model) throw new Error(`No model found for task: ${task}`);

  // Execute the model in transformers.js
  const result = await geoai.pipeline([{ task }], providerParams);

  return {
    task,
    result,
  };
}

export { queryAgent };
