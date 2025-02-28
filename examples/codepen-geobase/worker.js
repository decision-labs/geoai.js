import { geobaseAi, utils } from "../../build/dist/geobase-ai.js";

const instances = new Map();

async function getPipelineInstance(task, config, model) {
  const { instance } = await geobaseAi.pipeline(task, config, model);
  return instance;
}

async function callPipeline(task, instance_id, input) {
  const instance = instances.get(instance_id);
  if (task === "mask-generation") {
    const output = await instance.segment(input.polygon, input.input_points);
    const output_geojson = output.masks; //utils.maskToGeoJSON(output.mask, output.geoRawImage);
    return output_geojson;
  } else {
    const output = await instance.detection(input.polygon, input.label);
    const output_geojson = output.detections;
    return output_geojson;
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
