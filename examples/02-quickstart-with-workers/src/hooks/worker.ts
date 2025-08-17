import { geoai } from "@geobase.js/geoai";

let modelInstance: any = null;

// Use 'globalThis' instead of 'self' to avoid 'no-restricted-globals' ESLint error
const ctx: Worker = globalThis as any;

ctx.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case "init":
        modelInstance = await geoai.pipeline(
          payload.tasks,
          payload.providerParams
        );
        ctx.postMessage({ type: "ready" });
        break;

      case "inference":
        const result = await modelInstance.inference(payload);
        ctx.postMessage({ type: "result", payload: result });
        break;
    }
  } catch (error) {
    let message = "Unknown error";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    }
    ctx.postMessage({ type: "error", payload: message });
  }
};