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

    // 1. Intelligence Phase C: AST-aware context
    // If we have a cursorIndex, we try to find the surrounding block
    let contextCode = codeBeforeCursor;
    if (cursorIndex !== undefined) {
        const astContext = AstService.extractCurrentBlock(codeBeforeCursor, cursorIndex);
        if (astContext) {
            contextCode = astContext;
        }
    }

    // 2. Intelligence Phase C: RAG Search
    // Search for 2 most relevant chunks from the project
    const contextChunks = await vectorService.search(codeBeforeCursor, 2);

    // 3. Limit Context (Tail-cutting)
    const limitedCode = limitContext(contextCode);

    // 4. Build Deterministic Prompt with RAG
    const prompt = buildInlinePrompt(limitedCode, language, contextChunks);

    // 5. Setup Abort Handling via RequestManager
    const controller = new AbortController();
    requestManager.register(requestId, controller);

    req.on("close", () => {
        controller.abort();
        requestManager.unregister(requestId);
    });

    res.setHeader("Content-Type", "text/plain");

    let isHeaderSent = false;
    let aborted = false;

    // Track if request was aborted
    controller.signal.addEventListener("abort", () => {
        aborted = true;
    });

    await streamCompletion(
        prompt,
        controller.signal,
        (token, ttft) => {
            if (!aborted) {
                res.write(token);
            }
        },
        (err) => {
            requestManager.unregister(requestId);
            console.error("Stream Error:", err);
            if (!res.headersSent) {
                res.status(500).json({ error: "Generation failed" });
            } else {
                res.end();
            }
        },
        (totalDuration, ttft) => {
            requestManager.unregister(requestId);
            logPerformance({ ttft, totalDuration, aborted, requestId });
            res.end();
        }
    );
});

export default router;
