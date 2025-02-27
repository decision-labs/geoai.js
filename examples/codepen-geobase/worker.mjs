import { geobaseAi, utils } from "../../build/dist/geobase-ai.js";

async function initializePipeline() {
  console.log("Initializing pipeline");

  const geobaseConfig = document.querySelector("config").dataset;

  // Initialize the pipeline
  const { instance: pipeline } = await geobaseAi.pipeline(
    "zero-shot-object-detection",
    geobaseConfig
  );

  console.log("Pipeline initialized", { pipeline });

  const input_polygon = {
    type: "Feature",
    properties: {
      name: "area of interest",
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-102.32666, 19.531319],
          [-102.321167, 19.531319],
          [-102.321167, 19.536496],
          [-102.32666, 19.536496],
          [-102.32666, 19.531319],
        ],
      ],
    },
  };

  const input_label = ["building."];

  const output = await pipeline.detection(input_polygon, input_label);

  console.log("Output", { output });

  const output_geojson = utils.detectionsToGeoJSON(
    output.detections,
    output.geoRawImage
  );

  console.log("Output GeoJSON", { output_geojson });
}

initializePipeline();
