import express from "express";
import { vectorService } from "../services/vectorService.js";
import { AstService } from "../services/astService.js";

const router = express.Router();

/**
 * Endpoint to index a file into the vector store.
 * In Phase C, we keep it simple: split by lines/blocks and embed.
 */
router.post("/", async (req, res) => {
    const { text, filename } = req.body;

    if (!text || !filename) {
        return res.status(400).json({ error: "Text and filename required" });
    }

    // 1. Symbol-based chunks (Semantic structures)
    const symbols = AstService.extractSymbols(text);

    // 2. Line-based chunks (Safety fallback)
    const lines = text.split('\n');
    const chunkSize = 20;
    const fallbackChunks = [];
    for (let i = 0; i < lines.length; i += chunkSize) {
        fallbackChunks.push(lines.slice(i, i + chunkSize).join('\n'));
    }

    // Combine and deduplicate roughly (symbol chunks are prioritized)
    const chunks = [...new Set([...symbols, ...fallbackChunks])];

    console.log(`[RAG] Indexing ${chunks.length} chunks (${symbols.length} symbols) for ${filename}...`);

    let successCount = 0;
    for (const chunk of chunks) {
        const embedding = await vectorService.getEmbedding(chunk);
        if (embedding) {
            vectorService.addChunk(chunk, filename, embedding);
            successCount++;
        }
    }

    if (successCount === 0 && chunks.length > 0) {
        return res.status(500).json({
            error: "Failed to generate any embeddings.",
            suggestion: "Ensure 'ollama pull nomic-embed-text' has been run and Ollama is active."
        });
    }

    res.json({ message: "Indexed successfully", chunks: successCount });
});

export default router;
