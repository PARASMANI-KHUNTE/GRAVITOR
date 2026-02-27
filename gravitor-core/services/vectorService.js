import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_PATH = path.join(__dirname, "../data/vectorStore.json");

/**
 * Service to handle embeddings and simple vector search.
 * Now with persistence to survive restarts.
 */
export class VectorService {
    constructor() {
        this.memoryStore = [];
        this._loadStore();
    }

    _loadStore() {
        try {
            if (fs.existsSync(STORAGE_PATH)) {
                const data = fs.readFileSync(STORAGE_PATH, "utf8");
                this.memoryStore = JSON.parse(data);
                console.log(`[RAG] Loaded ${this.memoryStore.length} chunks from storage.`);
            }
        } catch (err) {
            console.error("[RAG] Failed to load vector store:", err);
            this.memoryStore = [];
        }
    }

    _saveStore() {
        try {
            const dir = path.dirname(STORAGE_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(STORAGE_PATH, JSON.stringify(this.memoryStore, null, 2));
        } catch (err) {
            console.error("[RAG] Failed to save vector store:", err);
        }
    }

    /**
     * Generates embedding for a text chunk using Ollama.
     */
    async getEmbedding(text) {
        try {
            const response = await axios.post("http://localhost:11434/api/embeddings", {
                model: "nomic-embed-text",
                prompt: text
            });
            return response.data.embedding;
        } catch (error) {
            console.error("Embedding failed:", error);
            return null;
        }
    }

    /**
     * Store a chunk with its embedding.
     */
    addChunk(text, filename, embedding) {
        // Simple deduplication by filename + text hash or exact match
        const exists = this.memoryStore.some(c => c.filename === filename && c.text === text);
        if (!exists) {
            this.memoryStore.push({ text, filename, embedding });
            this._saveStore();
        }
    }

    /**
     * Simple cosine similarity search.
     */
    async search(query, limit = 3) {
        console.log(`[RAG] Searching for: "${query.substring(0, 50)}..."`);
        if (this.memoryStore.length === 0) {
            console.log("[RAG] Store is empty. Returning 0 results.");
            return [];
        }

        const queryEmbedding = await this.getEmbedding(query);
        if (!queryEmbedding) return [];

        const results = this.memoryStore.map(chunk => {
            const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
            return { ...chunk, score };
        });

        const sorted = results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        console.log(`[RAG] Found ${sorted.length} relevant chunks.`);
        return sorted;
    }

    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

export const vectorService = new VectorService();
