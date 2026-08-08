#!/usr/bin/env bash
set -e

# =========================================
#   ARKIUM AI Desktop Chat - Setup Script
# =========================================

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "\n${BOLD}${CYAN}========================================${NC}"
echo -e "${BOLD}${CYAN}  ARKIUM AI Desktop Chat - Setup${NC}"
echo -e "${BOLD}${CYAN}========================================${NC}\n"

ERRORS=0
WARNINGS=0

ok() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; ((WARNINGS++)); }
fail() { echo -e "${RED}[ERROR]${NC} $1"; ((ERRORS++)); }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

# ---- 1. Node.js ----
echo "Checking Node.js..."
if command -v node &>/dev/null; then
    NODE_VER=$(node --version)
    NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        ok "Node.js $NODE_VER"
    else
        fail "Node.js $NODE_VER is too old. Please install Node.js 18+. Visit https://nodejs.org"
    fi
else
    fail "Node.js not found. Install from https://nodejs.org"
fi

# ---- 2. npm ----
echo "Checking npm..."
if command -v npm &>/dev/null; then
    ok "npm $(npm --version)"
else
    fail "npm not found."
fi

# ---- 3. Rust ----
echo "Checking Rust..."
if command -v rustc &>/dev/null; then
    ok "Rust $(rustc --version)"
else
    warn "Rust not found. Installing Rust via rustup..."
    if command -v curl &>/dev/null; then
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
        ok "Rust installed: $(rustc --version)"
    else
        fail "curl not found. Please install Rust manually: https://rustup.rs/"
    fi
fi

# ---- 4. Tauri system dependencies (Linux) ----
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Checking Linux system dependencies..."
    DISTRO=""
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
    fi

    TAURI_DEPS=(
        "libwebkit2gtk-4.1-dev"
        "libappindicator3-dev"
        "librsvg2-dev"
        "patchelf"
        "libssl-dev"
        "build-essential"
        "curl"
        "wget"
        "file"
        "libgtk-3-dev"
    )

    if command -v apt-get &>/dev/null; then
        info "Detected Debian/Ubuntu. Installing system dependencies..."
        sudo apt-get update -qq
        sudo apt-get install -y "${TAURI_DEPS[@]}" 2>/dev/null || warn "Some packages may not have installed. Check manually."
        ok "System dependencies installed"
    elif command -v dnf &>/dev/null; then
        info "Detected Fedora/RHEL. Installing system dependencies..."
        sudo dnf install -y webkit2gtk4.1-devel openssl-devel curl wget file gtk3-devel \
            librsvg2-devel libappindicator-gtk3-devel 2>/dev/null || warn "Some packages may not have installed."
        ok "System dependencies installed"
    elif command -v pacman &>/dev/null; then
        info "Detected Arch Linux. Installing system dependencies..."
        sudo pacman -S --needed --noconfirm webkit2gtk-4.1 openssl gtk3 librsvg \
            libappindicator-gtk3 2>/dev/null || warn "Some packages may not have installed."
        ok "System dependencies installed"
    else
        warn "Could not detect package manager. Install Tauri dependencies manually."
        info "See: https://v2.tauri.app/start/prerequisites/"
    fi
fi

# ---- 5. macOS Xcode command line tools ----
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Checking Xcode Command Line Tools..."
    if xcode-select -p &>/dev/null; then
        ok "Xcode Command Line Tools found"
    else
        warn "Xcode Command Line Tools not found. Installing..."
        xcode-select --install 2>/dev/null || warn "Please install Xcode Command Line Tools manually."
    fi
fi

# ---- 6. Ollama ----
echo "Checking Ollama..."
if command -v ollama &>/dev/null; then
    ok "Ollama $(ollama --version 2>/dev/null || echo 'found')"
else
    warn "Ollama not found. AI features require Ollama."
    info "Download Ollama from: https://ollama.ai"
    info "After installing, run: ollama pull llama3.2"
fi

# ---- 7. Install Node dependencies ----
echo ""
echo "Installing Node.js dependencies..."
npm install
ok "Node.js dependencies installed"

# ---- Summary ----
echo ""
echo -e "${BOLD}${CYAN}========================================${NC}"
echo -e "${BOLD}  Setup Summary${NC}"
echo -e "${BOLD}${CYAN}========================================${NC}"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}${BOLD}Setup completed successfully!${NC}"
else
    echo -e "${RED}${BOLD}Setup completed with $ERRORS error(s). Please fix them before building.${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}$WARNINGS warning(s) — review above${NC}"
fi

echo ""
echo -e "${BOLD}Quick Start:${NC}"
echo "  Development:   npm run tauri:dev"
echo "  Build:         npm run tauri:build"
echo "  Tests:         npm test"
echo ""
echo -e "${BOLD}Ollama Model Setup:${NC}"
echo "  ollama pull llama3.2     # General purpose (3B)"
echo "  ollama pull mistral      # Great reasoning (7B)"
echo "  ollama pull phi3         # Efficient (3.8B)"
echo ""

exit $ERRORS
