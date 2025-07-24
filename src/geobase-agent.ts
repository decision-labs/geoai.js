import { geoai } from "./index";
import { ProviderParams } from "./geobase-ai";
import {
  AutoTokenizer,
  AutoModelForSequenceClassification,
} from "@huggingface/transformers";

const tasks = [
  "object-detection:geobase/WALDO30_yolov8m_640x640",
  "zero-shot-object-detection:onnx-community/grounding-dino-tiny-ONNX",
  "zero-shot-object-detection:Xenova/owlvit-base-patch32",
  "mask-generation:Xenova/slimsam-77-uniform",
];

const model_descriptions = [
  "object-detection:geobase/WALDO30_yolov8m_640x640 - this model is trained to detect objects belonging to these classes: LightVehicle, Person, Building, Utility Pole, Boat, Bike, Container, Truck, Gastank, Digger, SolarPanels, Bus. It should be used for finding individual items in a drone or satellite image that fall into these categories. It should not be used for detecting areas or regions for example: a field, a forest or a body of water. Example queries: 'Detect all trucks in this urban area.', 'Find cars and motorcycles in this highway image.', 'Identify buildings in this industrial zone.', 'Locate all boats in this coastal image.', 'Spot utility poles in this rural road image.'",

  "zero-shot-object-detection:onnx-community/grounding-dino-tiny-ONNX - this model can detect objects given a label. If a label falls outside of the categories that a more specialised model can handle, this model should be used. Prefer not to use this model if the label is a specific object that is one of the ones from this list: LightVehicle, Person, Building, Utility Pole, Boat, Bike, Container, Truck, Gastank, Digger, SolarPanels, Bus. This is currently the best zero-shot object detection model for this task. Example queries: 'Find all aircraft in this satellite image.', 'Locate wind turbines in this region.', 'Identify train stations along this railway.', 'Detect oil rigs in this offshore area.', 'Find helipads on rooftops.'",

  "zero-shot-object-detection:Xenova/owlvit-base-patch32 - this model can detect objects given a label. If a label falls outside of the categories that a more specialised model can handle, this model should be used. Prefer not to use this model if the label is a specific object that is one of the ones from this list: LightVehicle, Person, Building, Utility Pole, Boat, Bike, Container, Truck, Gastank, Digger, SolarPanels, Bus. This is currently not the best zero-shot object detection model for this task. Example queries: 'Find all bridges crossing this river.', 'Locate antennas in this metropolitan area.', 'Identify sports stadiums in this city.', 'Detect railway signals along this track.', 'Spot water towers in suburban areas.'",

  "mask-generation:Xenova/slimsam-77-uniform - useful when user wants to find things that are best represented as contiguous areas like roads, farms, car-parks, lakes, arrays of solar panels or even mountain ranges. Not useful for finding individual items. Example queries: 'Segment all forests in this region.', 'Identify all lakes in this satellite image.', 'Find large solar farms in this desert area.', 'Detect all agricultural fields in this farmland.', 'Locate urban parks in this cityscape.'",
];
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
  const task: any = parts[0];
  const model_id = parts[1];

  const model = geoai.models().find(m => m.task === task);
  if (!model) throw new Error(`No model found for task: ${task}`);

  // Execute the model in transformers.js
  // const result = await geobaseAi.pipeline(task, providerParams, model_id);
  const result = await geoai.pipeline([{ task }], providerParams);

  return {
    task,
    model_id,
    result,
  };
}

export { queryAgent };
