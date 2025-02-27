import { geobaseAi } from "../src/geobase-ai";

const geoBaseParams = {
  provider: "geobase",
  projectRef: geobaseConfig.projectRef,
  cogImagery: geobaseConfig.cogImagery,
  apiKey: geobaseConfig.apikey,
};

async function initializePipeline() {
  // Initialize the pipeline
  const pipeline = await geobaseAi.pipeline(
    "zero-shot-object-detection",
    geoBaseParams
  );

  console.log("Pipeline initialized", { pipeline });

  // Function to process data using the pipeline

  // Example usage
  const exampleData = {
    // ...example data...
  };

  processData(exampleData);
}

initializePipeline();
