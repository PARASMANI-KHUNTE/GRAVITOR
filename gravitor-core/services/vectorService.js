import axios from "axios";

/**
 * Service to handle embeddings and simple vector search.
 */
export class VectorService {
    constructor() {
        this.memoryStore = []; // Simple JSON store in RAM
    }

    /**
     * Generates embedding for a text chunk using Ollama.
     */
    async getEmbedding(text) {
        try {
            const response = await axios.post("http://localhost:11434/api/embeddings", {
                model: "nomic-embed-text", // Standard embedding model
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
        this.memoryStore.push({ text, filename, embedding });
    }

    /**
     * Simple cosine similarity search.
     */
    async search(query, limit = 2) {
        const queryEmbedding = await this.getEmbedding(query);
        if (!queryEmbedding) return [];

        const results = this.memoryStore.map(chunk => {
            const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
            return { ...chunk, score };
        });

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
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
