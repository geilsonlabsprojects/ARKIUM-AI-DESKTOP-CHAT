# ARKIUM AI Desktop Chat — Security Guide

## Security Philosophy

ARKIUM is designed with a **local-first, permission-based** security model:

- All AI processing happens locally via Ollama — your conversations never leave your machine
- File operations require explicit user approval for writes and deletions
- Terminal commands require user confirmation before execution
- Read-only mode prevents all file modifications
- No telemetry or analytics are collected
- No data is sent to external servers except for optional web search

---

## Permission System

### Risk Levels

| Level | Color | Examples |
|-------|-------|---------|
| Low | Blue | Read files, list directories, web search |
| Medium | Yellow | Write files, create directories |
| High | Red | Delete files, execute commands |

### Permission Flow

```
Tool request
     │
     ▼
checkPermission(action, resource)
     │
     ├── Stored "Allow" → proceed
     ├── Stored "Deny" → block immediately
     └── No stored decision:
              │
              ▼
         PermissionDialog shown
              │
         User: Allow / Deny
              │ (+ optional "Remember")
              ▼
         Permission recorded (if remembered)
              │
         Action proceeds or is blocked
```

### Read-Only Mode

Enable in **Settings → Security → Read-only mode**.

In read-only mode:
- ❌ Write files
- ❌ Delete files/directories
- ❌ Create directories
- ❌ Execute terminal commands
- ❌ Extract ZIP archives
- ✅ Read files
- ✅ List directories
- ✅ Web search
- ✅ Chat with AI

---

## Terminal Safety

Before executing any shell command:

1. The command and arguments are displayed in a confirmation dialog
2. The user must explicitly click **Execute**
3. Dangerous command patterns are blocked outright:
   - `rm -rf /` and variants
   - `format` (Windows)
   - `dd if=/dev/zero`
   - Fork bombs
   - Mass system deletions

Command history is maintained in memory for the session.

---

## File System Boundaries

### Allowed paths (via Tauri FS scope):
- `$HOME/**` — User home directory
- `$DOCUMENT/**` — Documents
- `$DESKTOP/**` — Desktop
- `$DOWNLOAD/**` — Downloads
- `$APPDATA/**` — App data

### Blocked paths:
- `$HOME/.ssh/**` — SSH keys
- `$HOME/.gnupg/**` — GPG keys
- `/etc/shadow` — Linux password file
- `/etc/passwd` — Linux user database

### Path validation (Rust backend):

All file paths are validated against dangerous patterns before execution:
- `/../` — Directory traversal
- `/.ssh` — SSH config
- `/.gnupg` — GPG keys

---

## Network Security

### Ollama API
- Only communicates with `http://localhost:11434` by default (configurable)
- No authentication — Ollama is assumed to be local-only
- If you expose Ollama on a network, add firewall rules to restrict access

### Web Search
- Only sends the search query to the selected engine (DuckDuckGo, Brave, SearXNG)
- No query history is stored externally
- Searches are only performed when explicitly triggered

### HTTP Scope
All outbound HTTP is restricted by Tauri's CSP. The app can only make requests to HTTP/HTTPS endpoints defined in capabilities.

---

## Data Storage

| Data Type | Storage Location | Encrypted |
|-----------|-----------------|-----------|
| Conversations | `localStorage` (Zustand persist) | No |
| Settings | `localStorage` | No |
| Memories | `localStorage` | No |
| Database | `$APPDATA/arkium.db` (SQLite) | No |
| Logs | In-memory (session only) | N/A |

**Recommendation:** For sensitive data, use full-disk encryption (BitLocker, FileVault, LUKS) at the OS level.

---

## AI Agent Safety Guardrails

1. **Max steps limit** — Agent stops after 10 tool calls per query
2. **Timeout** — Each tool call has a configurable timeout
3. **User confirmation** — All write/delete/terminal operations require approval
4. **No silent execution** — Every tool invocation is logged in the UI
5. **Cancellation** — Agent can be stopped at any point
6. **Read-only compatibility** — In read-only mode, agent cannot modify files

---

## Responsible AI Usage

- ARKIUM uses local models via Ollama — AI responses reflect the model's training
- Do not rely on AI for medical, legal, or financial decisions
- Verify AI-generated code before deploying to production
- AI may produce incorrect information — always validate important outputs

---

## Reporting Security Issues

If you find a security vulnerability, please open a GitHub issue marked `[SECURITY]` or contact the maintainers directly. Do not post exploits publicly.
