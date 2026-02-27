import * as vscode from 'vscode';
import { ApiClient } from './apiClient';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'gravitor.chatView';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage': {
                    await this._handleMessage(data.value);
                    break;
                }
                case 'applyCode': {
                    await this._applyCodeToEditor(data.value);
                    break;
                }
                case 'applySearchReplace': {
                    await this._applySearchReplace(data.value.search, data.value.replace);
                    break;
                }
                case 'runTerminal': {
                    await this._runTerminalCommand(data.value);
                    break;
                }
            }
        });
    }

    private async _runTerminalCommand(command: string) {
        const confirmation = await vscode.window.showInformationMessage(
            `AI Suggestion: Run "${command}"?`,
            { modal: true },
            "Run"
        );

        if (confirmation !== "Run") {
            return;
        }

        const apiClient = new ApiClient();
        try {
            vscode.window.showInformationMessage(`Running: ${command}...`);
            const result = await apiClient.executeTerminalCommand(command);

            if (result.error) {
                this._view?.webview.postMessage({
                    type: 'terminalOutput',
                    value: `❌ Error: ${result.error}\n${result.stderr || ''}`
                });
            } else {
                this._view?.webview.postMessage({
                    type: 'terminalOutput',
                    value: result.stdout || result.stderr || '(No output)'
                });
            }
        } catch (err) {
            vscode.window.showErrorMessage("Failed to execute terminal command.");
        }
    }

    private async _applyCodeToEditor(code: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor to apply code to.");
            return;
        }

        const selection = editor.selection;
        await editor.edit(editBuilder => {
            if (!selection.isEmpty) {
                editBuilder.replace(selection, code);
            } else {
                editBuilder.insert(selection.active, code);
            }
        });
        vscode.window.showInformationMessage("Code applied successfully!");
    }

    private async _applySearchReplace(search: string, replace: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const text = editor.document.getText();
        const searchTrimmed = search.trim();
        let index = text.indexOf(searchTrimmed);

        if (index === -1) {
            const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
            const normalizedText = normalize(text);
            const normalizedSearch = normalize(searchTrimmed);
            const normIndex = normalizedText.indexOf(normalizedSearch);

            if (normIndex !== -1) {
                vscode.window.showErrorMessage("Found a partial match, but indentation differs. Please select the code manually and apply.");
                return;
            }

            vscode.window.showErrorMessage("Could find the exact code block to replace. Please ensure the AI has the latest code.");
            return;
        }

        const startPos = editor.document.positionAt(index);
        const endPos = editor.document.positionAt(index + searchTrimmed.length);
        const range = new vscode.Range(startPos, endPos);

        await editor.edit(editBuilder => {
            editBuilder.replace(range, replace.trim());
        });
        vscode.window.showInformationMessage("Refactored successfully!");
    }

    private async _handleMessage(text: string) {
        if (!this._view) {
            return;
        }

        this._view.webview.postMessage({ type: 'addUserMessage', value: text });

        const apiClient = new ApiClient();
        let responseText = '';

        const editor = vscode.window.activeTextEditor;
        const activeFileContext = editor ? {
            filename: editor.document.fileName,
            content: editor.document.getText()
        } : null;

        try {
            await apiClient.streamChat(
                [{ role: 'user', content: text }],
                (token: string) => {
                    responseText += token;
                    this._view?.webview.postMessage({ type: 'updateAiMessage', value: responseText });
                },
                activeFileContext
            );
        } catch (err) {
            this._view.webview.postMessage({ type: 'error', value: 'Failed to connect to Gravitor' });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background-color: var(--vscode-sideBar-background); padding: 10px; display: flex; flex-direction: column; height: 100vh; margin: 0; box-sizing: border-box; overflow: hidden; }
                    #chat-container { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; padding-bottom: 20px; }
                    .message { padding: 12px; border-radius: 8px; max-width: 90%; line-height: 1.5; word-wrap: break-word; font-size: 13px; position: relative; }
                    .user-message { align-self: flex-end; background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
                    .ai-message { align-self: flex-start; background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border); }
                    
                    /* Code Blocks */
                    pre { background: #1e1e1e; padding: 12px; border-radius: 6px; overflow-x: auto; color: #d4d4d4; position: relative; margin: 10px 0; border: 1px solid #333; }
                    code { font-family: var(--vscode-editor-font-family); }
                    .apply-btn { position: absolute; top: 5px; right: 5px; background: rgba(0, 122, 204, 0.8); color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; opacity: 0; transition: opacity 0.2s; z-index: 10; }
                    pre:hover .apply-btn { opacity: 1; }
                    .apply-btn:hover { background: #007acc; }

                    /* Terminal Styling */
                    .terminal-block { background: #000; color: #0f0; font-family: 'Courier New', monospace; padding: 10px; border-radius: 4px; border-left: 3px solid #0f0; margin: 5px 0; font-size: 12px; white-space: pre-wrap; max-height: 200px; overflow-y: auto; }
                    .terminal-label { color: #888; font-size: 10px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }

                    .smart-refactor { border: 1px solid var(--vscode-charts-yellow); }

                    #input-container { display: flex; gap: 8px; padding: 10px 0; border-top: 1px solid var(--vscode-widget-border); }
                    input { flex: 1; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 8px; border-radius: 4px; outline: none; }
                    input:focus { border-color: var(--vscode-focusBorder); }
                    button#send-btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; }
                    button#send-btn:hover { background: var(--vscode-button-hoverBackground); }
                </style>
            </head>
            <body>
                <div id="chat-container"></div>
                <div id="input-container">
                    <input type="text" id="message-input" placeholder="Ask Gravitor..." />
                    <button id="send-btn">Send</button>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const container = document.getElementById('chat-container');
                    const input = document.getElementById('message-input');
                    const btn = document.getElementById('send-btn');

                    let currentAiMsgElement = null;

                    btn.addEventListener('click', () => {
                        const val = input.value.trim();
                        if (val) {
                            vscode.postMessage({ type: 'sendMessage', value: val });
                            input.value = '';
                        }
                    });

                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') btn.click();
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'addUserMessage':
                                appendMessage(message.value, 'user-message');
                                currentAiMsgElement = appendMessage('...', 'ai-message');
                                break;
                            case 'updateAiMessage':
                                if (currentAiMsgElement) renderMarkdown(currentAiMsgElement, message.value);
                                break;
                            case 'terminalOutput':
                                appendTerminalOutput(message.value);
                                break;
                            case 'error':
                                if (currentAiMsgElement) currentAiMsgElement.innerText = 'Error: ' + message.value;
                                break;
                        }
                        container.scrollTop = container.scrollHeight;
                    });

                    function appendMessage(text, className) {
                        const div = document.createElement('div');
                        div.className = 'message ' + className;
                        div.innerText = text;
                        container.appendChild(div);
                        return div;
                    }

                    function appendTerminalOutput(text) {
                        const div = document.createElement('div');
                        div.className = 'ai-message message';
                        div.style.background = 'var(--vscode-editor-background)';
                        div.innerHTML = '<div class="terminal-label">Terminal Output</div><div class="terminal-block">' + text + '</div>';
                        container.appendChild(div);
                    }

                    function renderMarkdown(element, text) {
                        const parts = text.split(/(\`\`\`[\\s\\S]*?\`\`\`)/g);
                        element.innerHTML = '';
                        
                        parts.forEach(part => {
                            if (part.startsWith('\`\`\`')) {
                                let lang = part.match(/\`\`\`(\\w+)/)?.[1] || '';
                                const code = part.replace(/\`\`\`(\\w+)?\\n?/, '').replace(/\`\`\`$/, '');
                                
                                // 1. Smart Refactor Detection
                                const searchMatch = code.match(/<<<<<<< SEARCH([\\s\\S]*?)=======([\\s\\S]*?)>>>>>>> REPLACE/);
                                if (searchMatch) {
                                    const searchPart = searchMatch[1].trim();
                                    const replacePart = searchMatch[2].trim();
                                    const pre = document.createElement('pre');
                                    pre.className = 'smart-refactor';
                                    pre.innerHTML = '<div style="color: var(--vscode-charts-yellow); margin-bottom: 5px; font-size: 11px;">✨ Smart Refactor</div>';
                                    const codeDisplay = document.createElement('code');
                                    codeDisplay.innerText = 'Search: ' + searchPart.substring(0, 30) + '...\\nReplace: ' + (replacePart ? replacePart.substring(0, 30) : '[DELETE]');
                                    pre.appendChild(codeDisplay);
                                    const applyBtn = document.createElement('button');
                                    applyBtn.className = 'apply-btn';
                                    applyBtn.style.opacity = '1';
                                    applyBtn.innerText = 'Run Search & Replace';
                                    applyBtn.onclick = () => vscode.postMessage({ type: 'applySearchReplace', value: { search: searchPart, replace: replacePart } });
                                    pre.appendChild(applyBtn);
                                    element.appendChild(pre);
                                    return;
                                }

                                // 2. CLI/Terminal Detection
                                if (lang === 'sh' || lang === 'bash' || lang === 'shell' || lang === 'zsh') {
                                    const pre = document.createElement('pre');
                                    const codeEl = document.createElement('code');
                                    codeEl.innerText = code;
                                    const runBtn = document.createElement('button');
                                    runBtn.className = 'apply-btn';
                                    runBtn.innerText = 'Run in Terminal';
                                    runBtn.onclick = () => vscode.postMessage({ type: 'runTerminal', value: code.trim() });
                                    pre.appendChild(codeEl);
                                    pre.appendChild(runBtn);
                                    element.appendChild(pre);
                                    return;
                                }

                                // 3. Standard Code Block
                                const pre = document.createElement('pre');
                                const codeEl = document.createElement('code');
                                codeEl.innerText = code;
                                const applyBtn = document.createElement('button');
                                applyBtn.className = 'apply-btn';
                                applyBtn.innerText = 'Apply at Cursor';
                                applyBtn.onclick = () => vscode.postMessage({ type: 'applyCode', value: code });
                                pre.appendChild(codeEl);
                                pre.appendChild(applyBtn);
                                element.appendChild(pre);
                            } else {
                                const span = document.createElement('span');
                                span.innerText = part;
                                element.appendChild(span);
                            }
                        });
                    }
                </script>
            </body>
            </html>`;
    }
}
