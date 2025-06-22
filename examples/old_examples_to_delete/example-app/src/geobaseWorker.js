import { geobaseAi } from "geobase-ai";

this.onmessage = async event => {
  const { type, params } = event.data;
  if (type === "INIT") {
    const generator = await geobaseAi.pipeline("mask-generation", params);
    this.postMessage({ type: "RESULT", generator });
  }
};
