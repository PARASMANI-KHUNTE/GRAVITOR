import * as vscode from 'vscode';
import { ApiClient } from './apiClient';

export class GravitorInlineProvider implements vscode.InlineCompletionItemProvider {
    private apiClient: ApiClient;
    private abortController: AbortController | null = null;

    constructor() {
        this.apiClient = new ApiClient();
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionList | vscode.InlineCompletionItem[] | null> {

        // 1. Cancel previous request immediately (Aggressive Cancellation)
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        this.abortController = new AbortController();
        const currentAbort = this.abortController;

        // 2. Setup VS Code Token Cancellation
        token.onCancellationRequested(() => {
            currentAbort.abort();
        });

        // 3. Extract Context (Tail-cutting)
        const range = new vscode.Range(new vscode.Position(Math.max(0, position.line - 100), 0), position);
        const codeBeforeCursor = document.getText(range);

        if (!codeBeforeCursor.trim() || token.isCancellationRequested) {
            return null;
        }

        try {
            let completionText = '';

            // Get full text for AST logic on backend
            const fullText = document.getText();
            const cursorIndex = document.offsetAt(position);

            await this.apiClient.streamCompletion(
                codeBeforeCursor,
                document.languageId,
                currentAbort.signal,
                document.fileName,
                cursorIndex,
                (tokenChunk) => {
                    completionText += tokenChunk;
                }
            );

            if (!completionText || currentAbort.signal.aborted || token.isCancellationRequested) {
                return null;
            }

            const item = new vscode.InlineCompletionItem(completionText, new vscode.Range(position, position));
            return [item];

        } catch (error: any) {
            if (error.name === 'AbortError') {
                return null;
            }
            return null;
        } finally {
            if (this.abortController === currentAbort) {
                this.abortController = null;
            }
        }
    }
}
