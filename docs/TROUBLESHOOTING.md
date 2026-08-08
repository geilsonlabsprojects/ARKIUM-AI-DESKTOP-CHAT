# ARKIUM AI Desktop Chat — Troubleshooting

## Ollama Issues

### "Ollama not running" or "API not available"

**Check if Ollama is running:**
```bash
# Test API
curl http://localhost:11434/api/tags

# Start Ollama if it's not running
ollama serve
```

**Windows:** Check system tray for Ollama icon. If not present, open Ollama from Start menu.

**Linux/macOS:** Run `ollama serve` in a terminal or check if the service is running:
```bash
systemctl status ollama   # systemd
ps aux | grep ollama
```

### "No models available"

Pull at least one model:
```bash
ollama pull llama3.2     # 2GB — fast and capable
ollama pull phi3         # 2.2GB — very efficient
ollama pull mistral      # 4GB — excellent quality
```

List installed models:
```bash
ollama list
```

### Ollama on a different port or remote machine

Go to **Settings → Ollama → API URL** and change it:
```
http://192.168.1.100:11434
```

### Model generation is very slow

- Check if Ollama is using GPU: `ollama run llama3.2 "hello"` — if it says "using CPU", your GPU may not be configured.
- For NVIDIA GPU: ensure CUDA drivers are installed.
- Try a smaller model: `llama3.2:1b`, `phi3:mini`, `tinyllama`.
- Reduce context length in **Settings → AI → Context Length**.

---

## Build Issues

### "error: failed to run custom build command for tauri-build"

Ensure system dependencies are installed. Run:
```bash
./setup.sh   # Linux/macOS
setup.bat    # Windows
```

### "webkit2gtk not found" (Linux)

```bash
sudo apt install libwebkit2gtk-4.1-dev  # Ubuntu/Debian
sudo dnf install webkit2gtk4.1-devel     # Fedora
```

### Rust compilation fails with "out of memory"

Reduce parallel compilation:
```bash
CARGO_BUILD_JOBS=2 npm run tauri:build
```

Or add to `~/.cargo/config.toml`:
```toml
[build]
jobs = 2
```

### "Cannot find module" errors in frontend

```bash
rm -rf node_modules
npm install
```

### TypeScript errors

```bash
npm run type-check
```

---

## Runtime Issues

### App window doesn't open

1. Check for error output in the terminal
2. Try running in dev mode: `npm run tauri:dev`
3. Check `src-tauri/target/release/bundle/` logs

### File operations fail

- Check **Settings → Security** — ensure read-only mode is disabled
- Verify the path is within allowed directories
- On Linux/macOS, check file permissions: `ls -la /path/to/file`

### Web search returns no results

- Verify internet connection
- Try a different search engine in **Settings → Search**
- DuckDuckGo may rate-limit heavy usage — try Brave or SearXNG

### Chat is very slow or times out

- Increase timeout in **Settings → Ollama → Timeout**
- Reduce context length in **Settings → AI → Context Length**
- Use a smaller/faster model

### "Permission denied" dialog keeps appearing

Go to **Settings → Security** and enable "Remember my choice" when approving operations you trust. Or reduce security prompts for low-risk operations.

### Database errors on startup

The app uses SQLite in `$APPDATA/arkium.db`. If it's corrupted:

```bash
# Windows
del %APPDATA%\com.arkium.ai-desktop-chat\arkium.db

# Linux
rm ~/.local/share/com.arkium.ai-desktop-chat/arkium.db

# macOS
rm ~/Library/Application\ Support/com.arkium.ai-desktop-chat/arkium.db
```

The database will be recreated on next startup. Chat history stored in `localStorage` will still be available.

---

## Performance Issues

### High memory usage

- Close unused conversations
- Reduce **Settings → AI → Context Length** (4096 is a good default)
- Clear conversation history for long chats

### UI is laggy

- Reduce message history displayed per conversation
- Disable syntax highlighting for very long code blocks
- Ensure hardware acceleration is enabled in your OS

---

## Getting More Help

1. Check the [GitHub Issues](https://github.com/arkium/arkium-ai-desktop-chat/issues)
2. Run the app in dev mode for detailed error output: `npm run tauri:dev`
3. Check logs in the app: **Logs** page in the sidebar
4. Export logs from **Logs → Export** and include them in bug reports
