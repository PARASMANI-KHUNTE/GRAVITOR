interface TerminalExecuteResponse {
    stdout?: string;
    stderr?: string;
    error?: string;
    suggestion?: string;
}

export class ApiClient {
    private baseUrl: string = "http://localhost:3000";

    /**
     * Streams completion tokens from the orchestrator.
     */
    async streamCompletion(
        codeBeforeCursor: string,
        language: string,
        signal: AbortSignal,
        filename: string,
        cursorIndex: number,
        onToken: (token: string) => void
    ): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    codeBeforeCursor,
                    language,
                    filename,
                    cursorIndex,
                    requestId: `vscode-${Date.now()}`
                }),
                signal
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                return;
            }

            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                const chunk = decoder.decode(value, { stream: true });
                onToken(chunk);
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Request aborted');
            } else {
                console.error('API Client Error:', error);
                throw error;
            }
        }
    }

    async indexFile(text: string, filename: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/index`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, filename })
            });

            if (!response.ok) {
                throw new Error("Indexing failed");
            }
        } catch (error) {
            console.error("Index Error:", error);
            throw error;
        }
    }

    async executeTerminalCommand(command: string, cwd?: string): Promise<TerminalExecuteResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/terminal/execute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command, cwd })
            });

            return await response.json() as { stdout?: string; stderr?: string; error?: string; suggestion?: string };
        } catch (error) {
            console.error("Terminal Execute Error:", error);
            throw error;
        }
    }

    async streamChat(
        messages: { role: string; content: string }[],
        onToken: (token: string) => void,
        activeContext?: { filename: string; content: string } | null
    ): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages, activeContext, os: process.platform })
            });

            if (!response.ok) {
                throw new Error(`Chat error: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                return;
            }

            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                onToken(decoder.decode(value, { stream: true }));
            }
        } catch (error) {
            console.error("Chat API Error:", error);
            throw error;
        }
    }
}
