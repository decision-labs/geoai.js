const worker = new Worker("worker.js", {
  type: "module",
});

export function initializePipeline(task, config, model = "") {
  return new Promise((resolve, reject) => {
    console.log("Initializing pipeline");

    const msg = {
      type: "init",
      payload: {
        task,
        config,
      },
    };

    if (model) {
      msg.payload.model = model;
    }

    worker.postMessage(JSON.stringify(msg));

    worker.onmessage = function ({ data }) {
      if (data.type === "init") {
        console.log("Pipeline initialized");
        resolve(data.payload.instance_id);
      }
    };

    worker.onerror = function (error) {
      reject(error);
    };
  });
}

export function callPipeline(instance_id, input) {
  return new Promise((resolve, reject) => {
    console.log("Calling pipeline");

    const msg = JSON.stringify({
      type: "call",
      payload: {
        instance_id,
        input,
      },
    });

    worker.postMessage(msg);

    worker.onmessage = function ({ data }) {
      if (data.type === "call") {
        console.log("Pipeline finished task");
        resolve(data.payload.output);
      }
    };

    worker.onerror = function (error) {
      reject(error);
    };
  });
}
