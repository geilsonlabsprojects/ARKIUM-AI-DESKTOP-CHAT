import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "../types";

const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    defaultModel: "",
    temperature: 0.7,
    topP: 0.9,
    numCtx: 4096,
    streaming: true,
    systemPrompt: "You are ARKIUM, a helpful AI assistant. You are running locally via Ollama.",
  },
  ollama: {
    apiUrl: "http://localhost:11434",
    timeoutSeconds: 300,
  },
  search: {
    engine: "duckduckgo",
    maxResults: 8,
    language: "en",
    region: "us",
    timeoutSeconds: 15,
    autoSearch: false,
  },
  files: {
    workingDirectory: "",
    maxFileSizeMB: 10,
    allowedExtensions: ["txt", "md", "json", "yaml", "yml", "html", "css", "js", "ts", "tsx", "jsx", "py", "rs", "java", "c", "cpp", "h", "bat", "sh", "ps1", "csv"],
  },
  security: {
    confirmCommands: true,
    confirmDeletions: true,
    readOnlyMode: false,
    allowNetworkAccess: true,
  },
  interface: {
    theme: "dark",
    language: "en",
    fontSize: "medium",
    showLineNumbers: true,
    compactMode: false,
  },
};

interface SettingsState extends AppSettings {
  theme: "dark" | "light" | "system";
  updateSettings: (partial: Partial<AppSettings>) => void;
  updateAI: (partial: Partial<AppSettings["ai"]>) => void;
  updateOllama: (partial: Partial<AppSettings["ollama"]>) => void;
  updateSearch: (partial: Partial<AppSettings["search"]>) => void;
  updateFiles: (partial: Partial<AppSettings["files"]>) => void;
  updateSecurity: (partial: Partial<AppSettings["security"]>) => void;
  updateInterface: (partial: Partial<AppSettings["interface"]>) => void;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      get theme() {
        return get().interface.theme;
      },

      updateSettings: (partial) =>
        set((s) => ({
          ...s,
          ...partial,
        })),

      updateAI: (partial) =>
        set((s) => ({
          ai: { ...s.ai, ...partial },
        })),

      updateOllama: (partial) =>
        set((s) => ({
          ollama: { ...s.ollama, ...partial },
        })),

      updateSearch: (partial) =>
        set((s) => ({
          search: { ...s.search, ...partial },
        })),

      updateFiles: (partial) =>
        set((s) => ({
          files: { ...s.files, ...partial },
        })),

      updateSecurity: (partial) =>
        set((s) => ({
          security: { ...s.security, ...partial },
        })),

      updateInterface: (partial) =>
        set((s) => ({
          interface: { ...s.interface, ...partial },
        })),

      resetToDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "arkium-settings",
    }
  )
);
