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
  "solar-panel-detection",
  "ship-detection",
  "car-detection",
  "wetland-segmentation",
  "building-detection",
  "oil-storage-tank-detection",
  "building-footprint-segmentation",
];

const model_descriptions = [
  // object-detection
  "object-detection:geobase/WALDO30_yolov8m_640x640 - this model is trained to detect objects belonging to these classes: LightVehicle, Person, Building, Utility Pole, Boat, Bike, Container, Truck, Gastank, Digger, SolarPanels, Bus. It should be used for finding individual items in a drone or satellite image that fall into these categories. It should not be used for detecting areas or regions for example: a field, a forest or a body of water. Example queries: 'Detect all trucks in this urban area.', 'Find cars and motorcycles in this highway image.', 'Identify buildings in this industrial zone.', 'Locate all boats in this coastal image.', 'Spot utility poles in this rural road image.'",

  // zero-shot-object-detection (grounding-dino)
  "zero-shot-object-detection:onnx-community/grounding-dino-tiny-ONNX - this model can detect objects given a label. If a label falls outside of the categories that a more specialised model can handle, this model should be used. Prefer not to use this model if the label is a specific object that is one of the ones from this list: LightVehicle, Person, Building, Utility Pole, Boat, Bike, Container, Truck, Gastank, Digger, SolarPanels, Bus. This is currently the best zero-shot object detection model for this task. Example queries: 'Find all aircraft in this satellite image.', 'Locate wind turbines in this region.', 'Identify train stations along this railway.', 'Detect oil rigs in this offshore area.', 'Find helipads on rooftops.'",

  // zero-shot-object-detection (owlvit)
  "zero-shot-object-detection:Xenova/owlvit-base-patch32 - this model can detect objects given a label. If a label falls outside of the categories that a more specialised model can handle, this model should be used. Prefer not to use this model if the label is a specific object that is one of the ones from this list: LightVehicle, Person, Building, Utility Pole, Boat, Bike, Container, Truck, Gastank, Digger, SolarPanels, Bus. This is currently not the best zero-shot object detection model for this task. Example queries: 'Find all bridges crossing this river.', 'Locate antennas in this metropolitan area.', 'Identify sports stadiums in this city.', 'Detect railway signals along this track.', 'Spot water towers in suburban areas.'",

  // mask-generation
  "mask-generation:Xenova/slimsam-77-uniform - useful when user wants to find things that are best represented as contiguous areas like roads, farms, car-parks, lakes, arrays of solar panels or even mountain ranges. Not useful for finding individual items. Example queries: 'Segment all forests in this region.', 'Identify all lakes in this satellite image.', 'Find large solar farms in this desert area.', 'Detect all agricultural fields in this farmland.', 'Locate urban parks in this cityscape.'",

  // solar-panel-detection
  "solar-panel-detection:https://huggingface.co/geobase/geoai_models/resolve/main/solarPanelDetection_quantized.onnx - Detects and locates solar panels in satellite or aerial imagery. Useful for identifying solar farms, rooftop solar installations, or tracking renewable energy infrastructure. Example queries: 'Find all solar panels in this industrial area.', 'Locate solar farms in this desert region.', 'Identify rooftop solar installations in this city.'",

  // ship-detection
  "ship-detection:https://huggingface.co/geobase/geoai_models/resolve/main/shipDetection_quantized.onnx - Detects ships and large boats in maritime or coastal satellite imagery. Useful for monitoring shipping lanes, ports, or maritime activity. Example queries: 'Detect all ships in this harbor.', 'Find boats in this coastal image.', 'Identify vessels in open water.'",

  // car-detection
  "car-detection:https://huggingface.co/geobase/geoai_models/resolve/main/carDetectionUSA_quantized.onnx - Detects cars and other small vehicles in urban, suburban, or rural imagery. Useful for traffic analysis, parking lot monitoring, or urban planning. Example queries: 'Find all cars in this parking lot.', 'Detect vehicles on this highway.', 'Identify cars in this city block.'",

  // wetland-segmentation
  "wetland-segmentation:https://huggingface.co/geobase/geoai_models/resolve/main/wetland_detection_quantized.onnx - Segments and identifies wetland areas in satellite imagery. Useful for environmental monitoring, conservation, and land use planning. Example queries: 'Segment all wetlands in this region.', 'Identify marsh areas in this satellite image.', 'Find wetland zones near this river.', 'Find water bodies'",

  // building-detection
  "building-detection:https://huggingface.co/geobase/geoai_models/resolve/main/buildingDetection_quantized.onnx - Detects buildings and built structures in satellite or aerial imagery. Useful for urban development, disaster response, or infrastructure mapping. Example queries: 'Detect all buildings in this urban area.', 'Find houses in this rural region.', 'Identify structures in this industrial zone.'",

  // oil-storage-tank-detection
  "oil-storage-tank-detection:https://huggingface.co/geobase/oil-storage-tank-detection/resolve/main/oil_storage_tank_yolox_quantized.onnx - Detects oil storage tanks in industrial or port areas. Useful for monitoring energy infrastructure, compliance, or risk assessment. Example queries: 'Find all oil storage tanks in this refinery.', 'Detect tanks in this port facility.', 'Identify oil tanks in this industrial area.'",

  // building-footprint-segmentation
  "building-footprint-segmentation:https://huggingface.co/geobase/building_footprint_segmentation/resolve/main/model.onnx - Segments the precise outlines (footprints) of buildings in imagery. Useful for mapping, urban planning, or disaster assessment. Example queries: 'Segment building footprints in this city block.', 'Identify the outlines of all buildings in this image.', 'Find building perimeters in this urban area.'",
];
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
  // console.log(userQuery);
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
  // const result = await geobaseAi.pipeline(task, providerParams, model_id);
  const result = await geoai.pipeline([{ task }], providerParams);

  return {
    task,
    model_id,
    result,
  };
}

export { queryAgent };
