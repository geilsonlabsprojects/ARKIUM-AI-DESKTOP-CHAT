# ARKIUM AI Desktop Chat — Development Guide

## Prerequisites

- Node.js 18+
- Rust (stable)
- Ollama running locally

## Project Structure

```
ARKIUM-AI-DESKTOP-CHAT/
├── src/                        # React frontend
│   ├── components/             # Reusable UI components
│   │   ├── chat/               # Chat-specific components
│   │   ├── layout/             # App layout (Sidebar, StatusBar)
│   │   ├── onboarding/         # Welcome screen
│   │   └── ui/                 # Permission & terminal dialogs
│   ├── pages/                  # Route-level page components
│   ├── services/               # Business logic & API calls
│   ├── stores/                 # Zustand state stores
│   ├── types/                  # TypeScript type definitions
│   ├── i18n/                   # Translations (en, pt, es)
│   ├── styles/                 # Global CSS
│   ├── App.tsx                 # Root component + routing
│   └── main.tsx                # Entry point
├── src-tauri/                  # Tauri Rust backend
│   ├── src/
│   │   ├── commands/           # Tauri command handlers
│   │   │   ├── system.rs
│   │   │   ├── files.rs
│   │   │   ├── zip.rs
│   │   │   ├── terminal.rs
│   │   │   ├── security.rs
│   │   │   ├── websearch.rs
│   │   │   ├── ollama.rs
│   │   │   ├── rag.rs
│   │   │   └── db.rs
│   │   ├── database.rs         # DB init & schema
│   │   ├── tools.rs            # Tool definitions
│   │   ├── lib.rs              # App setup & handler registration
│   │   └── main.rs             # Binary entry point
│   ├── capabilities/           # Tauri permission capabilities
│   ├── icons/                  # App icons
│   ├── Cargo.toml
│   ├── build.rs
│   └── tauri.conf.json
├── docs/                       # Documentation
├── tests/                      # Test files
├── setup.bat                   # Windows setup
├── setup.sh                    # Linux/macOS setup
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Development Workflow

### Start dev server

```bash
npm run tauri:dev
```

This concurrently runs:
1. `vite` — frontend dev server on port 1420
2. `tauri dev` — compiles Rust backend, opens app window

### Frontend only (no Tauri window)

```bash
npm run dev
# Open http://localhost:1420
```

Note: Tauri commands will fail in browser-only mode since there's no native bridge.

### Run tests

```bash
npm test              # Run once (vitest --run)
npm run test:watch    # Watch mode
```

### Type checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

---

## Adding a New Page

1. Create `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`:
   ```tsx
   <Route path="/new-page" element={<NewPage />} />
   ```
3. Add nav item in `src/components/layout/Sidebar.tsx`:
   ```tsx
   { to: "/new-page", icon: SomeIcon, labelKey: "nav.new_page" }
   ```
4. Add translation key in `src/i18n/locales/en.json`

---

## Adding a New Tauri Command

1. Create or edit a file in `src-tauri/src/commands/`
2. Add the function with `#[tauri::command]`
3. Register in `src-tauri/src/lib.rs` in `invoke_handler`
4. Add to `src-tauri/capabilities/default.json` if needed
5. Call from frontend with `invoke("command_name", { params })`

Example:
```rust
// src-tauri/src/commands/example.rs
#[tauri::command]
pub async fn my_command(param: String) -> Result<String, String> {
    Ok(format!("Hello, {}!", param))
}
```

```rust
// src-tauri/src/lib.rs — add to invoke_handler:
commands::example::my_command,
```

```typescript
// Frontend:
import { invoke } from "@tauri-apps/api/core";
const result = await invoke<string>("my_command", { param: "world" });
```

---

## Adding a New Tool

1. Add definition to `src/services/tools.ts` in `TOOL_DEFINITIONS`:
   ```typescript
   {
     name: "my_tool",
     description: "Does something useful",
     parameters: { input: { type: "string", required: true } },
     requiresPermission: true,
     riskLevel: "medium",
   }
   ```

2. Add handler in `executeTool` switch statement:
   ```typescript
   case "my_tool": {
     return await myToolImplementation(input);
   }
   ```

3. The tool is now available to the AI agent automatically.

---

## Adding a Language

1. Create `src/i18n/locales/XX.json` (XX = language code)
2. Import and register in `src/i18n/index.ts`:
   ```typescript
   import xx from "./locales/xx.json";
   // In resources:
   xx: { translation: xx },
   ```
3. Add to language selector in `src/pages/SettingsPage.tsx`

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_OLLAMA_URL` | Override Ollama URL at build time | `http://localhost:11434` |

Set in `.env.local` (not committed):
```
VITE_OLLAMA_URL=http://custom-server:11434
```

---

## Styling Guidelines

- Use Tailwind CSS utility classes
- Dark mode is the default — use `bg-surface-*` and `text-zinc-*` variables
- Custom colors: `arkium-*` for brand, `surface-*` for backgrounds, `border-*` for borders
- Animations: Use the predefined `animate-fade-in`, `animate-slide-up` classes
- Components: Reuse `btn-primary`, `btn-secondary`, `btn-ghost`, `input-field`, `card`

---

## Performance Tips

- Keep Ollama `numCtx` reasonable (4096 default, 8192 max for most models)
- For RAG: use `nomic-embed-text` model for efficient embeddings
- Avoid loading all conversations into memory — use pagination for large histories
- ZIP creation for large projects: run async to avoid UI freezing

---

## Building for Production

```bash
npm run tauri:build
```

To target a specific platform bundle:
```bash
# Windows — only .msi
npm run tauri:build -- --bundles msi

# Linux — only AppImage
npm run tauri:build -- --bundles appimage

# macOS — only .dmg
npm run tauri:build -- --bundles dmg
```
