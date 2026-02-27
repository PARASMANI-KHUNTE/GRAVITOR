# Gravitor: The Fully Local AI Coding IDE

![Gravitor Banner](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200&h=400)

**Gravitor** is a production-grade, privacy-first AI coding assistant powered by **Ollama**. It delivers the premium experience of Copilot and Cursor, but with 100% local execution.

## ✨ Key Features

- 🚀 **Ghost Text Suggestions**: Premium, low-latency inline completions.
- 🧠 **Context-Aware Intelligence**: Uses **AST Light** and **Local RAG** (Vector Search) to understand your codebase.
- 🛡️ **Production Stability**: Aggressive request cancellation via `AbortController` to prevent race conditions and memory leaks.
- 🔒 **Safe CLI Execution**: A sandboxed terminal service with pre-approved commands and mandatory user confirmation.
- 🔥 **Streaming Logic**: Real-time token streaming for that buttery-smooth coding feel.

## 🏗 System Architecture

Gravitor is built with a decoupled, platform-level architecture:

1. **VS Code Extension (UX Layer)**: Handles editor hooks, Ghost Text rendering, and request debouncing.
2. **Orchestrator API (Backend)**: A Node.js service that manages prompts, context, and intelligence.
3. **Local LLM (Engine)**: Powered by Ollama (`deepseek-coder:6.7b` and `nomic-embed-text`).

## 🚀 Quick Start

### Prerequisites
- [Ollama](https://ollama.ai/) installed and running.
- `deepseek-coder:6.7b` and `nomic-embed-text` models pulled:
  ```bash
  ollama pull deepseek-coder:6.7b
  ollama pull nomic-embed-text
  ```

### Installation

1. **Clone the repo**:
   ```bash
   git clone https://github.com/your-username/gravitor.git
   cd gravitor
   ```

2. **Start the Orchestrator**:
   ```bash
   cd gravitor-core
   npm install
   npm run debug
   ```

3. **Install the Extension**:
   - Open `GravitorIDE/gravitor-ide` in VS Code.
   - Press `F5` to launch the Extension Development Host.

## 🛠 Tech Stack

- **Backend**: Node.js, Express, Axios.
- **Frontend**: VS Code Extension API, TypeScript.
- **Intelligence**: Vector Search (Cosine Similarity), Heuristic AST Parsing.

## 📄 License
MIT License. See `LICENSE` for details.

---
*Built with ❤️ for the future of local AI.*
