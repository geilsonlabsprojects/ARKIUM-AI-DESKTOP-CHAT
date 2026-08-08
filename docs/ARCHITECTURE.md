# ARKIUM AI Desktop Chat — Architecture

## Overview

ARKIUM is a desktop application built with Tauri 2, React 18, and TypeScript. It communicates with a local Ollama instance for AI inference, uses SQLite for persistence, and exposes a rich tool system for the AI agent.

```
┌─────────────────────────────────────────────────────────┐
│                  ARKIUM Desktop App                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              React Frontend (Vite)               │   │
│  │                                                   │   │
│  │  Pages      Components    Services    Stores     │   │
│  │  ─────────  ──────────    ────────    ──────     │   │
│  │  ChatPage   Layout        ollama.ts   appStore   │   │
│  │  Models     Sidebar       websearch   chatStore  │   │
│  │  Files      ChatInput     agent.ts    settings   │   │
│  │  Projects   MessageBubble tools.ts    prompts    │   │
│  │  Prompts    AgentSteps    rag.ts      memory     │   │
│  │  Settings   WelcomeScreen memory.ts   projects   │   │
│  └────────────────────────┬────────────────────────┘   │
│                            │ @tauri-apps/api             │
│  ┌─────────────────────────▼────────────────────────┐   │
│  │              Tauri Backend (Rust)                 │   │
│  │                                                   │   │
│  │  Commands                  Plugins               │   │
│  │  ────────                  ───────               │   │
│  │  system.rs    files.rs     tauri-plugin-fs       │   │
│  │  ollama.rs    zip.rs       tauri-plugin-http     │   │
│  │  websearch.rs terminal.rs  tauri-plugin-sql      │   │
│  │  security.rs  rag.rs       tauri-plugin-shell    │   │
│  │  db.rs                     tauri-plugin-store    │   │
│  └────────────────────────┬────────────────────────┘   │
└───────────────────────────┼─────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼────┐      ┌──────▼─────┐   ┌───────▼──────┐
    │ Ollama  │      │  SQLite DB  │   │  Filesystem  │
    │  API    │      │  (local)    │   │  (local)     │
    │:11434   │      │ arkium.db   │   │              │
    └─────────┘      └────────────┘   └──────────────┘
```

---

## Frontend Architecture

### State Management (Zustand)

| Store | Responsibility |
|-------|---------------|
| `appStore` | Global app state: Ollama status, permissions queue, terminal queue, logs, online state |
| `settingsStore` | All user settings persisted to localStorage |
| `chatStore` | Conversations and messages with persistence |
| `promptStore` | Prompt library with defaults |
| `projectStore` | Project registry |
| `memoryStore` | Local memory facts, preferences, conversation context |

### Service Layer

```
src/services/
  ollama.ts          — Ollama API: list models, chat stream, embeddings
  websearch.ts       — DuckDuckGo / Brave / SearXNG web search + page fetch
  agent.ts           — ReAct-style agent with tool calling loop
  tools.ts           — Tool registry and execution dispatcher
  rag.ts             — Document chunking, embedding, vector search
  memory.ts          — Memory extraction and context injection
  database.ts        — SQLite init via Tauri plugin
  promptImprover.ts  — AI-powered prompt enhancement
```

### Component Hierarchy

```
App
└── Layout
    ├── Sidebar
    │   └── ConversationList
    ├── Main Content (Routes)
    │   ├── ChatPage
    │   │   ├── MessageBubble (per message)
    │   │   ├── AgentStepsPanel
    │   │   └── ChatInput
    │   ├── ModelsPage
    │   ├── FilesPage
    │   ├── ProjectsPage
    │   ├── PromptsPage
    │   ├── SearchPage
    │   ├── MemoryPage
    │   ├── LogsPage
    │   └── SettingsPage
    └── StatusBar
```

---

## Backend Architecture (Rust/Tauri)

### Command Modules

| Module | Commands |
|--------|----------|
| `system.rs` | `get_system_info`, `check_ollama_status`, `get_hardware_info` |
| `files.rs` | `read_file_content`, `write_file_content`, `list_directory_contents`, `create_directory_cmd`, `delete_file_cmd`, `copy_file_cmd`, `search_files` |
| `zip.rs` | `create_zip_archive`, `extract_zip_archive`, `list_zip_contents` |
| `terminal.rs` | `execute_command`, `get_command_history` |
| `security.rs` | `check_permission`, `request_permission` |
| `websearch.rs` | `search_web` (DuckDuckGo/Brave/SearXNG), `fetch_url_content` |
| `ollama.rs` | `list_ollama_models`, `pull_ollama_model`, `delete_ollama_model`, `chat_ollama`, `generate_ollama`, `generate_embeddings` |
| `rag.rs` | `index_document`, `search_documents`, `list_indexed_documents`, `delete_indexed_document` |
| `db.rs` | `init_database`, `execute_query`, `fetch_query` |

---

## Data Flow: Chat with Web Search

```
User types message
       │
       ▼
ChatPage.handleSend()
       │
       ├─► shouldSearchWeb(message) → true?
       │         │
       │         ▼
       │   searchWeb(query) → Tauri → websearch.rs
       │         │            → DuckDuckGo/Brave/SearXNG
       │         │            → HTML scraping
       │         ▼
       │   SearchSource[] + formatSourcesForContext()
       │
       ├─► getMemoryContext() → inject user preferences
       │
       ▼
chatStream(model, messages+context, options)
       │
       ▼
fetch POST /api/chat to Ollama (streaming)
       │
       ▼
ReadableStream chunks → appendStreamChunk() → MessageBubble renders
       │
       ▼
onDone: updateMessage(sources, tokens, duration)
       │
       ▼
extractMemoriesFromConversation() → memoryStore
```

---

## Data Flow: Agent Mode

```
User message
       │
       ▼
runAgent(message, history, config, callbacks)
       │
       ▼
[Loop: max 10 steps]
       │
       ├─► chatStream(model, messages, AGENT_SYSTEM_PROMPT)
       │         │
       │         ▼
       │   Response contains <tool_call>...</tool_call>?
       │         │
       │   YES   ▼
       │   executeTool(name, input)
       │         │
       │         ├── Permission check (high-risk → PermissionDialog)
       │         ├── Terminal confirm (terminal → TerminalConfirmDialog)
       │         │
       │         ▼
       │   Tauri command or HTTP call
       │         │
       │         ▼
       │   Tool result appended to messages
       │         │
       │   NO    ▼
       └─► Final response → callbacks.onDone()
```

---

## Database Schema

```sql
conversations   — id, title, model, system_prompt, is_pinned, created_at, updated_at
messages        — id, conversation_id, role, content, thinking, model, tokens_used, duration_ms
prompts         — id, title, content, category, tags, is_favorite, use_count
settings        — key, value, updated_at
memory          — id, type, key, value, conversation_id, project_id, importance
logs            — id, level, message, source, metadata, created_at
rag_documents   — id, name, path, doc_type, chunks_count, indexed_at, size
tool_executions — id, tool_name, conversation_id, input, output, success, duration_ms
```

---

## Security Architecture

```
User Request
     │
     ▼
SecuritySettings (readOnlyMode check)
     │
     ▼
isWriteOperation(toolName)?
     │
     ├── YES → checkPermission(action, resource)
     │           │
     │           ├── Stored permission? → Allow/Deny immediately
     │           │
     │           └── Not stored? → Push to permissionQueue
     │                              │
     │                              ▼
     │                         PermissionDialog shown to user
     │                              │
     │                         Allow (+ remember?) / Deny
     │
     └── NO → Proceed directly
```

---

## RAG Pipeline

```
File Input
    │
    ▼
chunkText() — split into ~512-char overlapping chunks
    │
    ▼
generateEmbeddings(model, chunk) × N — Ollama nomic-embed-text
    │
    ▼
invoke("index_document") → VECTOR_STORE (in-memory Vec<DocumentChunk>)
    │
    ▼
User Query
    │
    ▼
generateEmbeddings(model, query)
    │
    ▼
invoke("search_documents") → cosine_similarity() for each stored chunk
    │
    ▼
Top K results (score ≥ threshold)
    │
    ▼
formatRagContext() → injected into Ollama prompt
```
