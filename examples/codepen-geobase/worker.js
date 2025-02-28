import { geobaseAi, utils } from "../../build/dist/geobase-ai.js";

const instances = new Map();

async function getPipelineInstance(task, config, model) {
  const { instance } = await geobaseAi.pipeline(task, config, model);
  return instance;
}

async function callPipeline(task, instance_id, input) {
  const instance = instances.get(instance_id);
  // make this a switch statement
  switch (task) {
    case "mask-generation": {
      const output = await instance.segment(input.polygon, input.input_points);
      const output_geojson = output.masks; //utils.maskToGeoJSON(output.mask, output.geoRawImage);
      return output_geojson;
    }
    case "zero-shot-object-detection": {
      const output = await instance.detection(input.polygon, input.label);
      const output_geojson = output.detections;
      return output_geojson;
    }
    case "object-detection": {
      const output = await instance.detection(input.polygon);
      const output_geojson = output.detections;
      return output_geojson;
    }
    default: {
      throw new Error(`Unknown task: ${task}`);
    }
  }
}

self.onmessage = async function (event) {
  const { type, payload } = JSON.parse(event.data);

  console.log(payload);

  switch (type) {
    case "init": {
      const instance = await getPipelineInstance(
        payload.task,
        payload.config,
        payload.model
      );
      const uuid = crypto.randomUUID();
      instances.set(uuid, instance);
      self.postMessage({ type: "init", payload: { instance_id: uuid } });
      break;
    }
    case "call": {
      const output = await callPipeline(
        payload.task,
        payload.instance_id,
        payload.input
      );
      self.postMessage({ type: "call", payload: { output } });
      break;
    }
    default:
      break;
  }
};
