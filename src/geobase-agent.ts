import { geoai } from "./index";
import { ProviderParams } from "./geobase-ai";
import {
  AutoTokenizer,
  AutoModelForSequenceClassification,
} from "@huggingface/transformers";

// Build tasks and descriptions from the registry dynamically
const models = geoai.models();
const tasks = models.map(model => {
  // Extract the default modelId from the geobase_ai_pipeline function signature
  const match = model.geobase_ai_pipeline
    .toString()
    .match(/modelId: string = "([^"]+)"/);
  const modelId = match ? match[1] : "";
  return `${model.task}:${modelId}`;
});
const model_descriptions = models.map(model => {
  const match = model.geobase_ai_pipeline
    .toString()
    .match(/modelId: string = "([^"]+)"/);
  const modelId = match ? match[1] : "";
  let desc = `${model.task}:${modelId} - ${model.description}`;
  if (model.examples && model.examples.length > 0) {
    desc += ` Example queries: '${model.examples.join("', '")}'.`;
  }
  return desc;
});
// Define available cross-encoder models for easy swapping
const CROSS_ENCODER_MODELS = {
  msMarcoTinyBERT: "Xenova/ms-marco-TinyBERT-L-2-v2",
  jinaRerankerTiny: "jinaai/jina-reranker-v1-tiny-en",
  jinaEmbeddingsSmall: "Xenova/jina-embeddings-v2-small-en",
  miniLML6v2: "Xenova/all-MiniLM-L6-v2",
  gteSmall: "Xenova/gte-small",
};

// Pick the model you want to use here:
const SELECTED_CROSS_ENCODER = CROSS_ENCODER_MODELS.jinaRerankerTiny;

const model = await AutoModelForSequenceClassification.from_pretrained(
  SELECTED_CROSS_ENCODER,
  { model_file_name: "model_quantized" }
);
const tokenizer = await AutoTokenizer.from_pretrained(SELECTED_CROSS_ENCODER);

/**
 * Parses user queries and determines which geospatial AI task(s) to run.
 */
async function parseQuery(userQuery: string) {
  const inputs = tokenizer(new Array(tasks.length).fill(userQuery), {
    text_pair: model_descriptions,
    padding: true,
    truncation: true,
  });
  const scores = await model(inputs);
  const bestTaskIndex = scores.logits.argmax().item();
  return tasks[bestTaskIndex];
}

/**
 * Runs the selected geospatial task in the AI pipeline.
 */
async function queryAgent(userQuery: string, providerParams: ProviderParams) {
  const results = await parseQuery(userQuery);
  const parts = results.split(":");
  const task: string = parts[0];
  const model_id = parts[1];

  const model = geoai.models().find(m => m.task === task);
  if (!model) throw new Error(`No model found for task: ${task}`);

  // Execute the model in transformers.js
  // TODO: Use geobaseAi.pipeline(task, providerParams, model_id) for direct model invocation when API is ready.
  const result = await geoai.pipeline([{ task }], providerParams);

  return {
    task,
    model_id,
    result,
  };
}

export { queryAgent };
