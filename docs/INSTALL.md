# ARKIUM AI Desktop Chat — Installation Guide

## Requirements

| Dependency | Version | Required | Notes |
|------------|---------|----------|-------|
| Node.js | 18+ | Yes | JavaScript runtime |
| Rust | stable | Yes | Tauri backend |
| Ollama | latest | Recommended | Local AI models |
| Git | any | Optional | Source control |

## Quick Install

### Windows

```bat
setup.bat
```

### Linux / macOS

```bash
chmod +x setup.sh
./setup.sh
```

---

## Manual Installation

### 1. Install Node.js

Download from [nodejs.org](https://nodejs.org) and install the LTS version (18+).

```bash
node --version  # should be v18 or higher
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

### 3. Install Tauri CLI system dependencies

**Ubuntu / Debian:**
```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev \
  patchelf libssl-dev build-essential curl wget file libgtk-3-dev
```

**Fedora:**
```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel gtk3-devel librsvg2-devel \
  libappindicator-gtk3-devel
```

**Arch Linux:**
```bash
sudo pacman -S webkit2gtk-4.1 openssl gtk3 librsvg libappindicator-gtk3
```

**macOS:**
```bash
xcode-select --install
```

**Windows:** No additional system dependencies required.

### 4. Install Ollama (recommended)

Download from [ollama.ai](https://ollama.ai) and follow the installer.

Then pull a model:
```bash
ollama pull llama3.2        # 3B — fast, general purpose
ollama pull mistral         # 7B — great reasoning
ollama pull phi3            # 3.8B — efficient
ollama pull codellama       # 7B — specialized for code
```

### 5. Install Node.js dependencies

```bash
npm install
```

---

## Running the Application

### Development mode

```bash
npm run tauri:dev
```

This starts the Vite dev server and opens the Tauri window. Hot reload is enabled for frontend changes.

### Production build

```bash
npm run tauri:build
```

Output is in `src-tauri/target/release/bundle/`.

---

## Build Outputs

| Platform | Format | Location |
|----------|--------|----------|
| Windows | `.exe` installer, `.msi` | `src-tauri/target/release/bundle/nsis/` |
| Linux | `.AppImage`, `.deb`, `.rpm` | `src-tauri/target/release/bundle/` |
| macOS | `.app`, `.dmg` | `src-tauri/target/release/bundle/macos/` |

---

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues.
