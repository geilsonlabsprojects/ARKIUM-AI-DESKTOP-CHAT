# ARKIUM AI DESKTOP CHAT

A complete, modern AI desktop application using Ollama for local AI processing.

## Features

- 🤖 Full Ollama integration with model management
- 💬 Multi-conversation chat with streaming
- 🌐 Real internet search (DuckDuckGo, Brave, SearXNG)
- 🧠 AI Agents with tools
- 📁 File management and analysis
- 📦 Project management with ZIP export
- 🔍 RAG (Retrieval-Augmented Generation)
- 🧠 Local memory system
- ✍️ Prompt manager with AI prompt improver
- 🖥️ Controlled terminal
- 🔐 Permission system
- 📊 Hardware detection
- 🌎 Multilingual support
- 🗄️ SQLite local database

## Stack

- **Desktop**: Tauri 2
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Database**: SQLite (via Tauri plugin)
- **AI**: Ollama (local)

## Quick Start

### Windows
```bat
setup.bat
```

### Linux/macOS
```bash
chmod +x setup.sh && ./setup.sh
```

## Requirements

- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) 18+
- [Ollama](https://ollama.ai/) (for AI features)

## Development

```bash
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

See [INSTALL.md](docs/INSTALL.md) for detailed instructions.
