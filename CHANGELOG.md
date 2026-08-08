# Changelog

All notable changes to ARKIUM AI Desktop Chat are documented here.

## [1.0.0] — 2026-08-08

### Initial Release

#### Core Features
- **Ollama Integration** — Full support for local AI models via Ollama API
- **Multi-conversation Chat** — Multiple conversations with history, pin, rename, delete, export
- **Streaming Responses** — Real-time token streaming with cancel support
- **Markdown Rendering** — Full markdown with syntax-highlighted code blocks, tables, and links
- **Message Actions** — Copy, edit, regenerate, delete messages

#### AI & Agents
- **AI Agent Mode** — ReAct-style agent with configurable tool calling
- **Web Search** — DuckDuckGo, Brave, SearXNG with source citations
- **Tool System** — 11 built-in tools: web_search, web_fetch, read_file, write_file, list_directory, create_directory, delete_file, create_zip, system_info, ollama_models, terminal
- **RAG** — Document indexing, chunking, embeddings, vector search

#### File Management
- **File Browser** — Navigate, view, create, delete files
- **ZIP Creation** — Create and extract ZIP archives
- **Project Manager** — Open, analyze, and export projects

#### Memory & Context
- **Local Memory** — Auto-extract facts and preferences from conversations
- **Memory Manager** — View, edit, and delete stored memories
- **Memory Context** — Inject relevant memories into AI context

#### Prompt System
- **Prompt Library** — Create, organize, and reuse prompts
- **AI Prompt Improver** — Enhance prompts using AI
- **Categories** — General, Coding, Writing, Analysis, Creative, Research
- **5 Default Prompts** — Code Reviewer, Project Analyzer, Bug Fixer, Technical Writer, React Component

#### Settings & Security
- **Permission System** — Confirm dangerous operations before execution
- **Terminal Confirmation** — Review commands before running
- **Read-Only Mode** — Prevent all file modifications
- **Configurable** — AI, Ollama, Search, Files, Security, Interface settings

#### Hardware & System
- **Hardware Detection** — CPU, RAM, GPU info for model recommendations
- **Model Recommendations** — Suggest appropriate models based on available RAM
- **Model Manager** — List, pull, delete, and select Ollama models
- **Offline Mode** — Chat continues working without internet

#### Interface
- **Dark Theme** — Professional dark UI (default)
- **Multilingual** — English, Portuguese, Brazilian Portuguese, Spanish
- **Sidebar Navigation** — Chat, Models, Files, Projects, Prompts, Search, Memory, Logs, Settings
- **Welcome Screen** — System check on first launch
- **Status Bar** — Ollama connection, model, online status

#### Platform Support
- Windows 10/11
- Linux (Ubuntu, Fedora, Arch, and others)
- macOS 11+
