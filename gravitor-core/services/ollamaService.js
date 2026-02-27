import axios from "axios";
import { MODEL_CONFIG } from "../config/modelConfig.js";

/**
 * Service to interact with local Ollama API.
 */
export const ollamaService = {
    /**
     * Streams completion tokens from Ollama.
     * returns a Promise that resolves when the stream is done.
     */
    async streamCompletion(payload, signal, onToken, onError) {
        return new Promise(async (resolve, reject) => {
            const startTime = Date.now();
            let ttft = null;

            const isChat = typeof payload === "object" && payload.messages;
            const endpoint = isChat ? "http://localhost:11434/api/chat" : "http://localhost:11434/api/generate";

            const body = typeof payload === "string"
                ? {
                    model: MODEL_CONFIG.model,
                    prompt: payload,
                    stream: true,
                    options: MODEL_CONFIG.options
                }
                : payload;

            try {
                const response = await axios({
                    method: "post",
                    url: endpoint,
                    data: body,
                    responseType: "stream",
                    signal: signal
                });

                const stream = response.data;

                const onData = (chunk) => {
                    if (ttft === null) {
                        ttft = Date.now() - startTime;
                    }

                    const lines = chunk.toString().split("\n").filter(Boolean);
                    for (const line of lines) {
                        try {
                            const parsed = JSON.parse(line);

                            let token = "";
                            if (parsed.response) {
                                token = parsed.response;
                            } else if (parsed.message && parsed.message.content) {
                                token = parsed.message.content;
                            }

                            if (token) {
                                onToken(token, ttft);
                            }

                            if (parsed.done) {
                                cleanup();
                                resolve({ duration: Date.now() - startTime, ttft });
                            }
                        } catch (e) {
                            // Partial JSON
                        }
                    }
                };

                const onErrorInternal = (err) => {
                    cleanup();
                    if (onError) onError(err);
                    reject(err);
                };

                const cleanup = () => {
                    stream.removeListener("data", onData);
                    stream.removeListener("error", onErrorInternal);
                    stream.removeListener("end", cleanup);
                    stream.removeListener("close", cleanup);
                };

                stream.on("data", onData);
                stream.on("error", onErrorInternal);
                stream.on("end", cleanup);
                stream.on("close", cleanup);

            } catch (err) {
                if (axios.isCancel(err)) {
                    console.log("[Ollama] Stream aborted by client.");
                    resolve({ aborted: true });
                } else {
                    if (onError) onError(err);
                    reject(err);
                }
            }
        });
    }
};

export const streamCompletion = ollamaService.streamCompletion;
