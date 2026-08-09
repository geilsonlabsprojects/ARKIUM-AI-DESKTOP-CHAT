# ARKIUM AI Desktop Chat

Desktop application for local AI conversations powered by [Ollama](https://ollama.ai). Built with Tauri 2, React 18, and TypeScript — runs entirely on your machine with no external API keys required.

---

## What is ARKIUM?

ARKIUM is a full-featured AI desktop chat application that works offline using local language models. It provides a modern interface for interacting with AI models via Ollama, with support for file analysis, web search, an agent mode with tool use, RAG (Retrieval-Augmented Generation), project management, and more.

---

## Main Features

- **Multi-conversation chat** — persistent history with streaming responses
- **AI Agent mode** — ReAct-style agent that can call tools (files, terminal, search, RAG)
- **Web search integration** — DuckDuckGo, Brave Search, or SearXNG
- **File management** — read, write, list, copy, and delete files via the AI
- **RAG (Retrieval-Augmented Generation)** — index documents and query them semantically
- **Project management** — organize work into projects with ZIP export
- **Prompt library** — save, organize, and improve prompts using AI
- **Memory system** — ARKIUM remembers facts and preferences across conversations
- **Model management** — list, pull, and delete Ollama models directly from the UI
- **Controlled terminal** — execute shell commands with user confirmation
- **Permission system** — all sensitive operations require explicit user approval
- **Theme support** — dark, light, and system themes
- **Multilingual** — English, Portuguese, and Spanish
- **Local database** — SQLite storage via Tauri plugin
- **Hardware detection** — view system info and Ollama status in the status bar

---

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Windows 10 x64 | Windows 11 x64 |
| RAM | 8 GB | 16 GB+ |
| Storage | 5 GB free | 20 GB+ (for models) |
| CPU | Any 64-bit | Modern multi-core |
| GPU | Not required | NVIDIA / AMD (for faster inference) |

> **Note:** Linux and macOS are supported when building from source. The pre-built `.exe` is Windows-only.

---

## Installation (End Users — Windows)

### Option 1: Installer (recommended)

Download `ARKIUM-AI-DESKTOP-CHAT.exe` and run it. The NSIS installer will guide you through the installation.

### Option 2: Production ZIP

1. Extract `ARKIUM-AI-DESKTOP-CHAT-prod.zip` to any folder.
2. Run `ARKIUM AI Desktop Chat_1.0.0_x64-setup.exe` inside the extracted folder.

### After Installing

1. Install [Ollama](https://ollama.ai) if you haven't already.
2. Pull at least one model:
   ```
   ollama pull llama3.2
   ```
3. Launch ARKIUM from the Start Menu or desktop shortcut.
4. On first launch, the welcome screen will guide you through initial setup.

---

## Configuration

All settings are available in the **Settings** page (⚙ icon in the sidebar).

### AI Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Default Model | Ollama model name to use | *(empty — set on first run)* |
| Temperature | Creativity level (0.0–2.0) | `0.7` |
| Context Length | Max tokens in context window | `4096` |
| System Prompt | Base instructions for the AI | *(empty)* |
| Streaming | Stream tokens as they arrive | `true` |

### Ollama Connection

| Setting | Description | Default |
|---------|-------------|---------|
| API URL | Ollama server address | `http://localhost:11434` |
| Timeout | Request timeout in seconds | `120` |

If Ollama is running on a different machine or port, update the API URL here.

### Web Search

| Setting | Description | Default |
|---------|-------------|---------|
| Engine | DuckDuckGo, Brave, or SearXNG | `duckduckgo` |
| Max Results | Number of results to fetch | `5` |
| Language | Search language | `en` |

> **Brave Search** and **SearXNG** require additional configuration (API key for Brave; a self-hosted SearXNG instance URL).

### Files

| Setting | Description | Default |
|---------|-------------|---------|
| Working Directory | Root path for file operations | Home directory |
| Max File Size | Maximum file size the AI can read | `10 MB` |

### Security

| Setting | Description | Default |
|---------|-------------|---------|
| Confirm Commands | Ask before executing shell commands | `true` |
| Confirm Deletions | Ask before deleting files | `true` |
| Read-Only Mode | Prevent AI from modifying any files | `false` |

### Interface

| Setting | Description | Default |
|---------|-------------|---------|
| Theme | dark / light / system | `dark` |
| Language | UI language | `en` |
| Font Size | small / medium / large | `medium` |

---

## Environment Variables

For development only. Set in a `.env.local` file at the project root (not committed to git):

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_OLLAMA_URL` | Override Ollama URL at build time | `http://localhost:11434` |

---

## How to Use

### Chat

1. Select or create a conversation from the sidebar.
2. Type your message and press Enter or click Send.
3. Toggle **Search** (🌐) to include web results in the context.
4. Toggle **Agent** (🤖) to let ARKIUM use tools autonomously.

### Agent Mode

When Agent mode is active, ARKIUM uses a ReAct loop to plan and execute steps:
- It can read/write files, search the web, run terminal commands, and query documents.
- Each tool use is shown in the **Agent Steps** panel.
- Sensitive operations (file writes, terminal commands) trigger confirmation dialogs.
- Click **Cancel** to stop the agent mid-execution.

### RAG (Document Q&A)

1. Go to the **Files** page.
2. Index a document (supports text files, code, markdown, PDF text).
3. In chat, the agent can retrieve relevant chunks using `search_documents`.

### Prompt Library

1. Go to the **Prompts** page to browse and manage saved prompts.
2. Use the **Improve** button to let AI refine your prompt.
3. Click a prompt to insert it into the chat input.

### Memory

ARKIUM automatically extracts and stores facts from conversations:
- User preferences, names, and recurring context are remembered across sessions.
- View and manage memories in the **Memory** page.

---

## Project Structure

```
ARKIUM-AI-DESKTOP-CHAT/
├── src/                        # React frontend (TypeScript)
│   ├── components/
│   │   ├── chat/               # ChatInput, MessageBubble, AgentStepsPanel, ConversationList
│   │   ├── layout/             # Layout, Sidebar, StatusBar
│   │   ├── onboarding/         # WelcomeScreen
│   │   └── ui/                 # PermissionDialog, TerminalConfirmDialog
│   ├── pages/                  # ChatPage, ModelsPage, FilesPage, ProjectsPage,
│   │                           # PromptsPage, SearchPage, MemoryPage, LogsPage, SettingsPage
│   ├── services/               # ollama.ts, agent.ts, tools.ts, rag.ts,
│   │                           # websearch.ts, memory.ts, database.ts, promptImprover.ts
│   ├── stores/                 # appStore, settingsStore, chatStore,
│   │                           # promptStore, projectStore, memoryStore
│   ├── types/                  # TypeScript type definitions
│   ├── i18n/                   # Locales: en.json, pt.json, es.json
│   ├── styles/                 # globals.css (Tailwind base)
│   ├── App.tsx                 # Root component + HashRouter routing
│   └── main.tsx                # React entry point
├── src-tauri/                  # Tauri Rust backend
│   ├── src/
│   │   ├── commands/           # system.rs, files.rs, zip.rs, terminal.rs,
│   │   │                       # security.rs, websearch.rs, ollama.rs, rag.rs, db.rs
│   │   ├── database.rs         # SQLite schema initialization
│   │   ├── tools.rs            # Tool registry definitions
│   │   ├── lib.rs              # Tauri app setup + command registration
│   │   └── main.rs             # Binary entry point
│   ├── capabilities/           # Tauri permission scopes
│   ├── icons/                  # App icons (.png, .ico, .icns)
│   ├── Cargo.toml              # Rust dependencies
│   ├── build.rs                # Tauri build script
│   └── tauri.conf.json         # Tauri configuration
├── docs/                       # Detailed documentation
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── INSTALL.md
│   ├── SECURITY.md
│   └── TROUBLESHOOTING.md
├── public/                     # Static assets (SVG icon)
├── scripts/                    # Build utility scripts
├── index.html                  # Vite HTML entry
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.js
├── setup.bat                   # Windows automated setup
└── setup.sh                    # Linux/macOS automated setup
```

---

## Technologies Used

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop runtime | Tauri | 2.x |
| Frontend framework | React | 18.x |
| Language | TypeScript | 5.x |
| Build tool | Vite | 5.x |
| Styling | Tailwind CSS | 3.x |
| State management | Zustand | 4.x |
| Routing | React Router | 7.x |
| Database | SQLite (via tauri-plugin-sql) | 2.x |
| AI backend | Ollama | any |
| HTTP client | fetch (browser API) | — |
| Markdown rendering | react-markdown + remark-gfm | 9.x |
| Icons | Lucide React | 0.44x |
| Animations | Framer Motion | 11.x |
| Notifications | react-hot-toast | 2.x |
| i18n | i18next + react-i18next | 23.x |
| Backend language | Rust | 1.97+ |

---

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) (stable, latest)
- [Ollama](https://ollama.ai) running locally

### Windows — Quick Setup

```bat
setup.bat
```

### Linux / macOS — Quick Setup

```bash
chmod +x setup.sh && ./setup.sh
```

### Manual Setup

```bash
# Install Node.js dependencies
npm install

# Start development mode (Vite + Tauri hot-reload)
npm run tauri:dev
```

---

## Building for Production

### Frontend only

```bash
npm run build
# Output: dist/
```

### Full Tauri build (generates installer)

```bash
npm run tauri:build
```

Build outputs on Windows:
- `src-tauri/target/release/arkium-ai-desktop-chat.exe` — raw executable
- `src-tauri/target/release/bundle/nsis/ARKIUM AI Desktop Chat_1.0.0_x64-setup.exe` — NSIS installer
- `src-tauri/target/release/bundle/msi/ARKIUM AI Desktop Chat_1.0.0_x64_en-US.msi` — MSI installer

To build only a specific installer format:

```bash
# NSIS installer only
npm run tauri:build -- --bundles nsis

# MSI only
npm run tauri:build -- --bundles msi
```

---

## Generating the EXE

The `.exe` is built as part of `npm run tauri:build`. The NSIS installer at:

```
src-tauri/target/release/bundle/nsis/ARKIUM AI Desktop Chat_1.0.0_x64-setup.exe
```

is the distributable installer. It includes all required runtime files and creates Start Menu entries and an uninstaller.

---

## Common Issues

### Ollama not connecting

- Make sure Ollama is running: `ollama serve`
- Check the API URL in Settings → Ollama (default: `http://localhost:11434`)
- On Windows, check Windows Firewall isn't blocking port 11434

### No models appear

- Pull a model first: `ollama pull llama3.2`
- Click the refresh button on the Models page

### App won't start after install

- Ensure you have the Visual C++ Redistributable installed (usually pre-installed on Windows 10/11)
- Try running as administrator once to initialize the app data directory

### Build fails — Rust compilation error

- Update Rust: `rustup update stable`
- Clear build cache: `cargo clean` inside `src-tauri/`
- Ensure all system libraries are installed (see `docs/INSTALL.md`)

### Build fails — Node.js error

- Clear npm cache: `npm cache clean --force`
- Delete `node_modules/` and reinstall: `npm install`

---

## Distribution

The release includes three files:

| File | Description |
|------|-------------|
| `ARKIUM-AI-DESKTOP-CHAT.exe` | NSIS installer — run to install the application |
| `ARKIUM-AI-DESKTOP-CHAT-prod.zip` | Production bundle — contains installer + MSI |
| `ARKIUM-AI-DESKTOP-CHAT-source.zip` | Source code — for development and review |

---

## License

MIT License — see [LICENSE](LICENSE) file for details.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
