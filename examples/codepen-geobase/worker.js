import { geobaseAi } from "../../build/dist/geobase-ai.js";

const instances = new Map();

async function getPipelineInstance(task, config, model) {
  const { instance } = await geobaseAi.pipeline(task, config, model);
  return instance;
}

async function callPipeline(task, instance_id, input) {
  const instance = instances.get(instance_id);
  if (!instance) {
    throw new Error(`Pipeline instance with id ${instance_id} not found`);
  }

  switch (task) {
    case "mask-generation": {
      const output = await instance.segment(input.polygon, input.input_points);
      const output_geojson = output.masks;
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
  try {
    const { id, type, payload } = JSON.parse(event.data);

    console.log(`Worker received: ${type}`, payload);

    let responsePayload;

    switch (type) {
      case "init": {
        const instance = await getPipelineInstance(
          payload.task,
          payload.config,
          payload.model
        );
        const uuid = crypto.randomUUID();
        instances.set(uuid, instance);
        responsePayload = { instance_id: uuid };
        break;
      }
      case "call": {
        const output = await callPipeline(
          payload.task,
          payload.instance_id,
          payload.input
        );
        responsePayload = { output };
        break;
      }
      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage(
      JSON.stringify({
        id,
        type,
        payload: responsePayload,
        success: true,
      })
    );
  } catch (error) {
    // Handle any errors and send them back to the main thread
    const parsedData =
      typeof event.data === "string" ? JSON.parse(event.data) : event.data;

    self.postMessage(
      JSON.stringify({
        id: parsedData.id,
        type: "error",
        payload: {
          message: error.message,
          stack: error.stack,
        },
        success: false,
      })
    );
  }
};
