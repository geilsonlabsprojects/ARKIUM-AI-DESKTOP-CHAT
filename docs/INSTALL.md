# ARKIUM AI Desktop Chat — Installation Guide

## Requirements

| Dependency | Version | Required | Notes |
|------------|---------|----------|-------|
| Node.js | 18+ | Yes | JavaScript runtime |
| Rust | stable (1.70+) | Yes | Tauri backend compiler |
| Ollama | latest | Recommended | Provides local AI models |
| Git | any | Optional | For cloning the repository |

> Windows pre-built installer: no Rust or Node.js required. Just download and run `ARKIUM-AI-DESKTOP-CHAT.exe`.

---

## End-User Install (Windows)

1. Download `ARKIUM-AI-DESKTOP-CHAT.exe`.
2. Run the installer and follow the prompts.
3. Install [Ollama](https://ollama.ai) and pull a model:
   ```
   ollama pull llama3.2
   ```
4. Launch **ARKIUM AI Desktop Chat** from the Start Menu.

---

## Developer Install (Build from Source)

### 1. Install Node.js 18+

Download from [nodejs.org](https://nodejs.org) — use the LTS release.

```bash
node --version   # v18.0.0 or higher
npm --version
```

### 2. Install Rust

```bash
# Linux / macOS
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Windows — download and run:
# https://win.rustup.rs/x86_64
```

Verify:
```bash
rustc --version
cargo --version
```

### 3. Install Tauri system dependencies (Linux only)

**Ubuntu / Debian:**
```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev \
  patchelf libssl-dev build-essential curl wget file libgtk-3-dev
```

**Fedora:**
```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel gtk3-devel \
  librsvg2-devel libappindicator-gtk3-devel
```

**Arch Linux:**
```bash
sudo pacman -S webkit2gtk-4.1 openssl gtk3 librsvg libappindicator-gtk3
```

**macOS:** `xcode-select --install`

**Windows:** No additional system dependencies required.

### 4. Install Ollama

Download from [ollama.ai](https://ollama.ai) and follow the installer.

Pull a model (required for AI features):

```bash
ollama pull llama3.2        # 2 GB — fast, general purpose
ollama pull mistral         # 4 GB — strong reasoning
ollama pull phi3            # 2.3 GB — very efficient
ollama pull codellama       # 4 GB — optimized for code
ollama pull nomic-embed-text # required for RAG embeddings
```

### 5. Clone and install

```bash
git clone https://github.com/arkium/arkium-ai-desktop-chat.git
cd arkium-ai-desktop-chat
npm install
```

Or use the automated setup scripts:

**Windows:**
```bat
setup.bat
```

**Linux / macOS:**
```bash
chmod +x setup.sh && ./setup.sh
```

---

## Running in Development Mode

```bash
npm run tauri:dev
```

This starts:
1. Vite dev server on port 1420 (frontend hot-reload)
2. Tauri process that compiles Rust and opens the app window

---

## Building for Production

```bash
npm run tauri:build
```

This runs `npm run build` (frontend) then compiles Rust in release mode and creates installers.

**Windows outputs:**
```
src-tauri/target/release/bundle/nsis/ARKIUM AI Desktop Chat_1.0.0_x64-setup.exe
src-tauri/target/release/bundle/msi/ARKIUM AI Desktop Chat_1.0.0_x64_en-US.msi
```

---

## Build Outputs by Platform

| Platform | Format | Location |
|----------|--------|----------|
| Windows | `.exe` (NSIS) | `bundle/nsis/` |
| Windows | `.msi` | `bundle/msi/` |
| Linux | `.AppImage` | `bundle/appimage/` |
| Linux | `.deb` | `bundle/deb/` |
| macOS | `.app` + `.dmg` | `bundle/macos/` |

---

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for solutions to common issues.
