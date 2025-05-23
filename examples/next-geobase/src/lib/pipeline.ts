// import * as worker from './worker.js';

let worker: Worker | undefined;

// Only initialize worker on client side
if (typeof window !== 'undefined') {
    console.debug('[Pipeline] Initializing worker');
    worker = new Worker(new URL('./worker.js', import.meta.url));
}

// Create a message handling system
const messageHandlers = new Map<number, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }>();
let messageIdCounter = 0;

interface WorkerMessage {
    id: number;
    type: string;
    payload: unknown;
    success: boolean;
}

interface PipelineConfig {
    task: string;
    config: unknown;
    model?: string;
}

interface PipelineInput {
    polygon: unknown;
    [key: string]: unknown;
}

// Set up the message handling
if (typeof window !== 'undefined' && worker) {
    worker.onmessage = function (event: MessageEvent<WorkerMessage>) {
        try {
            const { id, type, payload, success } = event.data;
            console.debug(`[Pipeline] Received worker message:`, { id, type, success });

            if (messageHandlers.has(id)) {
                const { resolve, reject } = messageHandlers.get(id)!;
                messageHandlers.delete(id);

                if (success) {
                    console.debug(`[Pipeline] Resolving message ${id} with payload:`, payload);
                    resolve({ type, payload });
                } else {
                    console.error(`[Pipeline] Rejecting message ${id} with error:`, payload);
                    reject(new Error(typeof payload === 'string' ? payload : 'Unknown error'));
                }
            } else {
                console.warn(`[Pipeline] Received response for unknown message id: ${id}`);
            }
        } catch (error) {
            console.error("[Pipeline] Error parsing worker message:", error);
        }
    };

    worker.onerror = function (error: ErrorEvent) {
        console.error("[Pipeline] Worker error:", error);

        // Reject all pending promises when the worker errors
        for (const [id, { reject }] of messageHandlers.entries()) {
            console.warn(`[Pipeline] Rejecting pending message ${id} due to worker error`);
            reject(new Error("Worker encountered an error"));
            messageHandlers.delete(id);
        }
    };
}

function sendWorkerMessage(type: string, payload: unknown, timeoutMs = 300000) {
    if (typeof window === 'undefined' || !worker) {
        console.error('[Pipeline] Attempted to use worker in non-browser environment');
        return Promise.reject(new Error('Workers can only be used in browser environment'));
    }
    
    return new Promise((resolve, reject) => {
        const id = messageIdCounter++;
        console.debug(`[Pipeline] Sending worker message:`, { id, type, payload });
        messageHandlers.set(id, { resolve, reject });

        // Send message using structured cloning
        worker.postMessage({
            id,
            type,
            payload,
        });

        // Set a timeout to clean up abandoned promises
        const timeoutId = setTimeout(() => {
            if (messageHandlers.has(id)) {
                console.error(`[Pipeline] Message ${id} timed out after ${timeoutMs}ms`);
                messageHandlers.delete(id);
                reject(
                    new Error(
                        `Worker response timeout after ${timeoutMs}ms for operation: ${type}`
                    )
                );
            }
        }, timeoutMs);

        // Modify the resolve function to clear the timeout
        const originalResolve = messageHandlers.get(id)!.resolve;
        messageHandlers.set(id, {
            resolve: (value: unknown) => {
                clearTimeout(timeoutId);
                console.debug(`[Pipeline] Message ${id} resolved:`, value);
                originalResolve(value);
            },
            reject: (reason: unknown) => {
                clearTimeout(timeoutId);
                console.error(`[Pipeline] Message ${id} rejected:`, reason);
                reject(reason);
            },
        });
    });
}

/**
 * Initializes a pipeline with the given task and configuration
 * @returns {Promise<string>} The instance ID of the initialized pipeline
 */
export async function initPipeline(task: string, config: unknown, model?: string) {
    console.debug("[Pipeline] Initializing pipeline", { task, config, model });

    try {
        const response = await sendWorkerMessage("init", {
            task,
            config,
            model,
        });

        if (response && typeof response === 'object' && 'payload' in response) {
            const payload = response.payload as { instance_id: string };
            console.debug("[Pipeline] Pipeline initialized successfully", payload.instance_id);
            return payload.instance_id;
        }
        throw new Error("Invalid response format from worker");
    } catch (error) {
        console.error("[Pipeline] Pipeline initialization failed", error);
        throw error;
    }
}

/**
 * Calls a pipeline with the given task, instance ID and input
 * @returns {Promise<any>} The output from the pipeline
 */
export async function callPipeline(task: string, instance_id: string, input: PipelineInput) {
    console.debug("[Pipeline] Calling pipeline", { instance_id, input });

    try {
        const response = await sendWorkerMessage("call", {
            task,
            instance_id,
            input,
        });

        if (response && typeof response === 'object' && 'payload' in response) {
            const payload = response.payload as { output: unknown };
            console.debug("[Pipeline] Pipeline call completed successfully", payload.output);
            return payload.output;
        }
        throw new Error("Invalid response format from worker");
    } catch (error) {
        console.error("[Pipeline] Pipeline call failed", error);
        throw error;
    }
}

/**
 * Terminates the worker when the page is unloaded
 */
if (typeof window !== 'undefined') {
    window.addEventListener("unload", () => {
        console.debug("[Pipeline] Terminating worker");
        worker?.terminate();
    });
}
