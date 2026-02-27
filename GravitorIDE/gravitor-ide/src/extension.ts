import * as vscode from 'vscode';
import { GravitorInlineProvider } from './inlineProvider';
import { ApiClient } from './apiClient';
import { ChatViewProvider } from './chatViewProvider';


export function activate(context: vscode.ExtensionContext) {

    const askAiCommand = vscode.commands.registerCommand('gravitor-ide.askAI', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor");
            return;
        }

        const position = editor.selection.active;
        const range = new vscode.Range(new vscode.Position(0, 0), position);
        const textBeforeCursor = editor.document.getText(range);

        try {
            const response = await fetch("http://localhost:3000/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ codeBeforeCursor: textBeforeCursor, language: editor.document.languageId })
            });

            const result = await response.text();
            if (!editor) {
                return;
            }

            const currentPosition = editor.selection.active;
            await editor.edit(editBuilder => {
                editBuilder.insert(currentPosition, "\n" + result);
            });

        } catch (err) {
            vscode.window.showErrorMessage("AI request failed");
        }
    });

    // Register indexing command
    const indexCommand = vscode.commands.registerCommand('gravitor-ide.indexFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const text = editor.document.getText();
        const filename = editor.document.fileName;

        const apiClient = new ApiClient();
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Gravitor: Indexing File...",
            cancellable: false
        }, async () => {
            try {
                await apiClient.indexFile(text, filename);
                vscode.window.showInformationMessage(`Indexed ${filename} successfully`);
            } catch (err) {
                vscode.window.showErrorMessage("Indexing failed");
            }
        });
    });

    // Register the Inline Completion Provider (Ghost Text)
    const runCommand = vscode.commands.registerCommand('gravitor-ide.runCommand', async () => {
        const command = await vscode.window.showInputBox({
            prompt: "Enter command to run in Gravitor Sandbox",
            placeHolder: "e.g. npm test"
        });

        if (!command) {
            return;
        }

        const confirmation = await vscode.window.showInformationMessage(
            `Confirm execution of: ${command}`,
            { modal: true },
            "Run"
        );

        if (confirmation !== "Run") {
            return;
        }

        const apiClient = new ApiClient();
        try {
            const result = await apiClient.executeTerminalCommand(command);
            if (result.error) {
                vscode.window.showErrorMessage(`Execution failed: ${result.error}. ${result.suggestion || ""}`);
            } else {
                const output = result.stdout || result.stderr || "Command executed with no output.";
                vscode.window.showInformationMessage("Execution Successful. Check output?");
                console.log(output); // In a real IDE, we'd pipe this to an output channel
            }
        } catch (err) {
            vscode.window.showErrorMessage("Terminal request failed");
        }
    });

    // Register the Inline Completion Provider (Ghost Text)
    const inlineProvider = vscode.languages.registerInlineCompletionItemProvider(
        { pattern: '**' }, // All languages
        new GravitorInlineProvider()
    );

    // Phase F: Chat Sidebar
    const chatProvider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatProvider)
    );

    const focusChat = vscode.commands.registerCommand('gravitor-ide.focusChat', () => {
        vscode.commands.executeCommand('gravitor.chatView.focus');
    });

    // Phase E: Auto-Indexing on save
    const onSaveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
        const apiClient = new ApiClient();
        try {
            await apiClient.indexFile(document.getText(), document.fileName);
            // Silent success for auto-indexing to avoid notification fatigue
            console.log(`[Gravitor] Auto-indexed ${document.fileName}`);
        } catch (err) {
            console.error(`[Gravitor] Auto-indexing failed for ${document.fileName}`);
        }
    });

    context.subscriptions.push(askAiCommand, indexCommand, runCommand, inlineProvider, onSaveListener, focusChat);
}

export function deactivate() { }