# ARKIUM AI Desktop Chat — Development Guide

## Prerequisites

- Node.js 18+
- Rust stable (1.70+)
- Ollama running locally

## Quick Start

```bash
npm install
npm run tauri:dev
```

---

## Project Structure

```
ARKIUM-AI-DESKTOP-CHAT/
├── src/                        # React frontend
│   ├── components/
│   │   ├── chat/               # ChatInput, MessageBubble, AgentStepsPanel, ConversationList
│   │   ├── layout/             # Layout, Sidebar, StatusBar
│   │   ├── onboarding/         # WelcomeScreen
│   │   └── ui/                 # PermissionDialog, TerminalConfirmDialog
│   ├── pages/                  # Route-level pages
│   │   ├── ChatPage.tsx
│   │   ├── ModelsPage.tsx
│   │   ├── FilesPage.tsx
│   │   ├── ProjectsPage.tsx
│   │   ├── PromptsPage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── MemoryPage.tsx
│   │   ├── LogsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/               # Business logic & API calls
│   │   ├── ollama.ts           — Ollama API (models, chat stream, embeddings)
│   │   ├── agent.ts            — ReAct agent loop with tool execution
│   │   ├── tools.ts            — Tool registry and dispatcher
│   │   ├── rag.ts              — RAG: chunking, embedding, vector search
│   │   ├── websearch.ts        — Web search + page fetch
│   │   ├── memory.ts           — Memory extraction and context injection
│   │   ├── database.ts         — SQLite init via Tauri plugin
│   │   └── promptImprover.ts   — AI-powered prompt improvement
│   ├── stores/                 # Zustand state stores
│   │   ├── appStore.ts         — Global state, Ollama status, logs
│   │   ├── settingsStore.ts    — All user settings (persisted)
│   │   ├── chatStore.ts        — Conversations and messages
│   │   ├── promptStore.ts      — Prompt library
│   │   ├── projectStore.ts     — Project registry
│   │   └── memoryStore.ts      — Memory facts
│   ├── types/                  # TypeScript type definitions (index.ts)
│   ├── i18n/                   # Internationalization
│   │   ├── index.ts
│   │   └── locales/            — en.json, pt.json, es.json
│   ├── styles/                 # globals.css (Tailwind base + custom classes)
│   ├── App.tsx                 # Root component + HashRouter routing
│   └── main.tsx                # React entry point
│
├── src-tauri/                  # Tauri Rust backend
│   ├── src/
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── system.rs       — System info, Ollama status check
│   │   │   ├── files.rs        — File CRUD operations
│   │   │   ├── zip.rs          — ZIP creation and extraction
│   │   │   ├── terminal.rs     — Shell command execution
│   │   │   ├── security.rs     — Permission checks
│   │   │   ├── websearch.rs    — DuckDuckGo/Brave/SearXNG + page fetch
│   │   │   ├── ollama.rs       — Ollama REST API integration
│   │   │   ├── rag.rs          — Document indexing, vector search
│   │   │   └── db.rs           — SQLite raw queries
│   │   ├── database.rs         — App database schema initialization
│   │   ├── tools.rs            — ToolDefinition structs
│   │   ├── lib.rs              — Tauri builder + command registration
│   │   └── main.rs             — Binary entry point
│   ├── capabilities/
│   │   └── default.json        — Tauri permission scopes
│   ├── icons/                  — App icons (32x32.png, 128x128.png, icon.ico, etc.)
│   ├── Cargo.toml
│   ├── build.rs
│   └── tauri.conf.json
│
├── docs/                       # Documentation
├── public/                     # Static assets
├── scripts/                    # Build helpers
├── tests/                      # Test files
├── setup.bat                   # Windows automated setup
├── setup.sh                    # Linux/macOS automated setup
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── postcss.config.js
```

---

## Available Scripts

```bash
npm run dev          # Start Vite dev server only (no Tauri window)
npm run build        # TypeScript check + Vite production build → dist/
npm run tauri:dev    # Full dev mode: Vite + Tauri hot-reload
npm run tauri:build  # Full production build + installers
npm run type-check   # TypeScript type checking only
npm run lint         # ESLint
npm run test         # Run Vitest tests once
npm run test:watch   # Vitest in watch mode
```

---

## Development Workflow

### Start the full app in dev mode

```bash
npm run tauri:dev
```

Hot-reload is enabled for frontend (React/TypeScript). Rust backend changes require a restart.

### Frontend only (no native window)

```bash
npm run dev
# Open http://localhost:1420
```

Tauri-specific commands (`invoke(...)`) will fail in browser-only mode.

---

## Adding a New Page

1. Create `src/pages/NewPage.tsx`
2. Add the route in `src/App.tsx`:
   ```tsx
   <Route path="/new-page" element={<NewPage />} />
   ```
3. Add a nav item in `src/components/layout/Sidebar.tsx`
4. Add translation keys in `src/i18n/locales/en.json` (and pt.json, es.json)

---

## Adding a New Tauri Command

1. Add the function to a file in `src-tauri/src/commands/`:
   ```rust
   #[tauri::command]
   pub async fn my_command(param: String) -> Result<String, String> {
       Ok(format!("Hello, {}!", param))
   }
   ```
2. Register it in `src-tauri/src/lib.rs` inside `tauri::generate_handler![...]`
3. Add to `src-tauri/capabilities/default.json` if it requires special permissions
4. Call from the frontend:
   ```typescript
   import { invoke } from "@tauri-apps/api/core";
   const result = await invoke<string>("my_command", { param: "world" });
   ```

---

## Adding a New Agent Tool

1. Add the definition in `src/services/tools.ts` inside `TOOL_DEFINITIONS`:
   ```typescript
   {
     name: "my_tool",
     description: "Does something useful",
     parameters: { input: { type: "string", required: true } },
     requiresPermission: true,
     riskLevel: "medium",   // "low" | "medium" | "high"
   }
   ```
2. Add the handler in the `executeTool` switch statement:
   ```typescript
   case "my_tool": {
     return await myToolImplementation(input);
   }
   ```
3. The tool is automatically available to the agent in all conversations.

---

## Adding a Language

1. Create `src/i18n/locales/XX.json` (copy from `en.json`)
2. Register it in `src/i18n/index.ts`:
   ```typescript
   import xx from "./locales/xx.json";
   // In resources:
   xx: { translation: xx },
   ```
3. Add the option to the language selector in `src/pages/SettingsPage.tsx`

---

## Environment Variables

Set in `.env.local` (at project root, not committed):

```dotenv
VITE_OLLAMA_URL=http://custom-server:11434
```

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_OLLAMA_URL` | Override Ollama URL at build time | `http://localhost:11434` |

The runtime URL is always read from `settingsStore`, so this variable only affects the initial/default value baked into the build.

---

## Styling Guidelines

- Use Tailwind CSS classes throughout
- Custom theme tokens: `bg-surface-{0–4}`, `border-border-{1–3}`, `text-zinc-*`
- Brand color: `arkium-*` (defined in `tailwind.config.js`)
- Reusable classes defined in `src/styles/globals.css`:
  - `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`
  - `input-field`
  - `card`
  - `animate-fade-in`, `animate-slide-up`
- Dark mode is the default — avoid hardcoded light colors

---

## Building for Production

```bash
npm run tauri:build
```

To build only specific installer formats:

```bash
npm run tauri:build -- --bundles nsis    # Windows installer (.exe)
npm run tauri:build -- --bundles msi     # Windows MSI
npm run tauri:build -- --bundles appimage # Linux AppImage
npm run tauri:build -- --bundles dmg     # macOS DMG
```

---

## Running Tests

```bash
npm run test
```

Test files live in `tests/` and use [Vitest](https://vitest.dev).

---

## TypeScript Notes

- All Tauri `invoke` calls should be typed: `invoke<ReturnType>("command", { params })`
- Use the types in `src/types/index.ts` — avoid inline `any`
- Stores use Zustand with full TypeScript interfaces
- The `AgentStep`, `AgentStatus`, `Message`, `Attachment`, `SearchSource` types are central to the chat system
