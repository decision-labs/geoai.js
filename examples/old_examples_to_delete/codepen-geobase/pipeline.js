const worker = new Worker("worker.js", {
  type: "module",
});

// Create a message handling system
const messageHandlers = new Map();
let messageIdCounter = 0;

// Set up the message handling
worker.onmessage = function (event) {
  try {
    const { id, type, payload, success } = JSON.parse(event.data);

    if (messageHandlers.has(id)) {
      const { resolve, reject } = messageHandlers.get(id);
      messageHandlers.delete(id);

      if (success) {
        resolve({ type, payload });
      } else {
        reject(new Error(payload.message));
      }
    } else {
      console.warn(`Received response for unknown message id: ${id}`);
    }
  } catch (error) {
    console.error("Error parsing worker message:", error);
  }
};

worker.onerror = function (error) {
  console.error("Worker error:", error);

  // Reject all pending promises when the worker errors
  for (const [id, { reject }] of messageHandlers.entries()) {
    reject(new Error("Worker encountered an error"));
    messageHandlers.delete(id);
  }
};

/**
 * Sends a message to the worker and returns a promise that resolves with the response
 */
function sendWorkerMessage(type, payload, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const id = messageIdCounter++;

    // Store the handlers for this specific message
    messageHandlers.set(id, { resolve, reject });

    // Add the ID to the message
    worker.postMessage(
      JSON.stringify({
        id,
        type,
        payload,
      })
    );

    // Set a timeout to clean up abandoned promises
    const timeoutId = setTimeout(() => {
      if (messageHandlers.has(id)) {
        messageHandlers.delete(id);
        reject(
          new Error(
            `Worker response timeout after ${timeoutMs}ms for operation: ${type}`
          )
        );
      }
    }, timeoutMs);

    // Modify the resolve function to clear the timeout
    const originalResolve = messageHandlers.get(id).resolve;
    messageHandlers.set(id, {
      resolve: value => {
        clearTimeout(timeoutId);
        originalResolve(value);
      },
      reject: reason => {
        clearTimeout(timeoutId);
        reject(reason);
      },
    });
  });
}

/**
 * Initializes a pipeline with the given task, config, and optional model
 * @returns {Promise<string>} The instance ID of the initialized pipeline
 */
export async function initializePipeline(task, config, model = "") {
  console.log("Initializing pipeline", {
    task,
    config,
    model: model || "(default)",
  });

  const payload = { task, config };
  if (model) {
    payload.model = model;
  }

  try {
    const response = await sendWorkerMessage("init", payload);
    console.log("Pipeline initialized successfully", response.payload);
    return response.payload.instance_id;
  } catch (error) {
    console.error("Pipeline initialization failed", error);
    throw error;
  }
}

/**
 * Calls a pipeline with the given task, instance ID and input
 * @returns {Promise<any>} The output from the pipeline
 */
export async function callPipeline(task, instance_id, input) {
  console.log("Calling pipeline", { instance_id, input });

  try {
    const response = await sendWorkerMessage("call", {
      task,
      instance_id,
      input,
    });

    console.log("Pipeline call completed successfully");
    return response.payload.output;
  } catch (error) {
    console.error("Pipeline call failed", error);
    throw error;
  }
}

/**
 * Terminates the worker when the page is unloaded
 */
window.addEventListener("unload", () => {
  worker.terminate();
});
