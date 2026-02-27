import express from "express";
import { buildInlinePrompt } from "../services/promptBuilder.js";
import { streamCompletion } from "../services/ollamaService.js";
import { limitContext } from "../guards/tokenLimiter.js";
import { logPerformance } from "../services/loggingService.js";
import { requestManager } from "../services/requestManager.js";
import { AstService } from "../services/astService.js";
import { vectorService } from "../services/vectorService.js";

const router = express.Router();

router.post("/", async (req, res) => {
    const { codeBeforeCursor, language, requestId = "local-session", filename = "file", cursorIndex } = req.body;

    // 1. AST-aware context
    let contextCode = codeBeforeCursor;
    if (cursorIndex !== undefined) {
        const astContext = AstService.extractCurrentBlock(codeBeforeCursor, cursorIndex);
        if (astContext) {
            contextCode = astContext;
        }
    }

    // 2. RAG Search
    const contextChunks = await vectorService.search(codeBeforeCursor, 2);

    // 3. Limit Context
    const limitedCode = limitContext(contextCode);

    // 4. Build Prompt
    const prompt = buildInlinePrompt(limitedCode, language, contextChunks);

    // 5. Abort Handling
    const controller = new AbortController();
    requestManager.register(requestId, controller);

    req.on("close", () => {
        controller.abort();
        requestManager.unregister(requestId);
    });

    res.setHeader("Content-Type", "text/plain");

    let aborted = false;
    controller.signal.addEventListener("abort", () => {
        aborted = true;
    });

    try {
        const stats = await streamCompletion(
            prompt,
            controller.signal,
            (token, ttft) => {
                if (!aborted && !res.writableEnded) {
                    res.write(token);
                }
            },
            (err) => {
                console.error("Stream Error:", err);
            }
        );

        requestManager.unregister(requestId);

        if (stats && !stats.aborted) {
            logPerformance({
                ttft: stats.ttft,
                totalDuration: stats.duration,
                aborted: false,
                requestId
            });
        }

        if (!res.writableEnded) {
            res.end();
        }
    } catch (err) {
        requestManager.unregister(requestId);
        console.error("Generation Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Generation failed" });
        } else if (!res.writableEnded) {
            res.end();
        }
    }
});

export default router;
