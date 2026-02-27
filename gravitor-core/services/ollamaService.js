import axios from "axios";
import { MODEL_CONFIG } from "../config/modelConfig.js";

/**
 * Service to interact with local Ollama API with AbortSignal support.
 */
export const streamCompletion = async (prompt, signal, onToken, onError, onComplete) => {
    const startTime = Date.now();
    let ttft = null;

    try {
        const response = await axios({
            method: "post",
            url: "http://localhost:11434/api/generate",
            data: {
                model: MODEL_CONFIG.model,
                prompt: prompt,
                stream: true,
                options: MODEL_CONFIG.options
            },
            responseType: "stream",
            signal: signal // Use the AbortSignal for immediate cancellation
        });

        const onData = (chunk) => {
            if (ttft === null) {
                ttft = Date.now() - startTime;
            }

            const lines = chunk.toString().split("\n").filter(Boolean);
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.response) {
                        onToken(parsed.response, ttft);
                    }
                    if (parsed.done) {
                        cleanup();
                        onComplete(Date.now() - startTime, ttft);
                    }
                } catch (e) {
                    console.error("Failed to parse chunk", e);
                }
            }
        };

        const onErrorInternal = (err) => {
            cleanup();
            onError(err);
        };

        const cleanup = () => {
            response.data.removeListener("data", onData);
            response.data.removeListener("error", onErrorInternal);
        };

        response.data.on("data", onData);
        response.data.on("error", onErrorInternal);

    } catch (err) {
        if (axios.isCancel(err)) {
            console.log("Ollama request aborted by client (axios).");
        } else {
            onError(err);
        }
    }
};
