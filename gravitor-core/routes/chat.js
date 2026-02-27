import express from "express";
import { ollamaService } from "../services/ollamaService.js";
import { vectorService } from "../services/vectorService.js";

const router = express.Router();

/**
 * Chat route for the Sidebar WebView.
 * Prioritizes activeContext (current file) and falls back to RAG.
 */
router.post("/", async (req, res) => {
    const { messages, activeContext, os = "unknown" } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array required" });
    }

    const lastUserMessage = messages[messages.length - 1].content;

    // 1. RAG Search for general context
    const contextChunks = await vectorService.search(lastUserMessage, 3);
    let contextText = contextChunks.map(c => `[${c.filename}]\n${c.text}`).join("\n---\n");

    // 2. Add Active File Context (if provided)
    if (activeContext) {
        contextText = `[ACTIVE FILE: ${activeContext.filename}]\n${activeContext.content}\n\n---\n${contextText}`;
    }

    // 3. Build Chat Messages
    const chatMessages = [
        {
            role: "system",
            content: `You are Gravitor, a professional AI coding assistant.
Use the following project context if relevant:
---
${contextText}
---
ENVIRONMENT:
- Operating System: ${os}
- Shell: ${os === 'win32' ? 'PowerShell/CMD' : 'Bash/Zsh'}

Rules:
- Be concise and technical.
- ALWAYS use triple backticks (\`\`\`) for any code or commands.
- YOU HAVE HANDS: You can edit files and run terminal commands through specialized blocks.
- **FILE EDITS**: For any refactor/cleanup, you MUST use this EXACT Search/Replace format:
  \`\`\`
  <<<<<<< SEARCH
  [exact code to find]
  =======
  [new code]
  >>>>>>> REPLACE
  \`\`\`
- **CLI ACCESS**: To run a terminal command (tests, installs, etc.), use a shell block:
  \`\`\`sh
  [command]
  \`\`\`
- Use complete SEARCH blocks for perfect matches.
- Work with the provided context.`
        },
        ...messages
    ];

    const chatBody = {
        model: "deepseek-coder:6.7b",
        messages: chatMessages,
        stream: true
    };

    console.log(`[Chat] New session. Context size: ${contextChunks.length} RAG chunks. Active file: ${activeContext ? 'YES' : 'NO'}`);

    res.setHeader("Content-Type", "text/plain");

    try {
        await ollamaService.streamCompletion(
            chatBody,
            null,
            (token) => {
                if (!res.writableEnded) res.write(token);
            }
        );
        if (!res.writableEnded) res.end();
    } catch (err) {
        console.error("[Chat Route Error]", err);
        if (!res.writableEnded) {
            res.write("\n[Chat Error]: " + err.message);
            res.end();
        }
    }
});

export default router;
