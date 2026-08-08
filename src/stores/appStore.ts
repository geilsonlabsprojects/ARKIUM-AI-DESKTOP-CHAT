import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OllamaStatus, PermissionRequest, TerminalCommand, LogEntry } from "../types";

interface AppState {
  // First run
  isFirstRun: boolean;
  setFirstRun: (val: boolean) => void;

  // Ollama status
  ollamaStatus: OllamaStatus | null;
  setOllamaStatus: (status: OllamaStatus | null) => void;

  // Online status
  isOnline: boolean;
  setIsOnline: (val: boolean) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Active conversation
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Permission queue
  permissionQueue: PermissionRequest[];
  pushPermission: (req: PermissionRequest) => void;
  resolvePermission: (id: string, granted: boolean, remember: boolean) => void;

  // Terminal confirm queue
  terminalQueue: TerminalCommand[];
  pushTerminalCommand: (cmd: TerminalCommand) => void;
  resolveTerminalCommand: (id: string, confirmed: boolean) => void;

  // Logs
  logs: LogEntry[];
  addLog: (entry: Omit<LogEntry, "id" | "createdAt">) => void;
  clearLogs: () => void;

  // Global loading
  globalLoading: boolean;
  setGlobalLoading: (val: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isFirstRun: true,
      setFirstRun: (val) => set({ isFirstRun: val }),

      ollamaStatus: null,
      setOllamaStatus: (status) => set({ ollamaStatus: status }),

      isOnline: navigator.onLine,
      setIsOnline: (val) => set({ isOnline: val }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      activeConversationId: null,
      setActiveConversationId: (id) => set({ activeConversationId: id }),

      permissionQueue: [],
      pushPermission: (req) =>
        set((s) => ({ permissionQueue: [...s.permissionQueue, req] })),
      resolvePermission: (id, granted, remember) => {
        const req = get().permissionQueue.find((r) => r.id === id);
        if (req) {
          req.resolve(granted, remember);
          set((s) => ({
            permissionQueue: s.permissionQueue.filter((r) => r.id !== id),
          }));
        }
      },

      terminalQueue: [],
      pushTerminalCommand: (cmd) =>
        set((s) => ({ terminalQueue: [...s.terminalQueue, cmd] })),
      resolveTerminalCommand: (id, confirmed) => {
        const cmd = get().terminalQueue.find((c) => c.id === id);
        if (cmd) {
          cmd.resolve(confirmed);
          set((s) => ({
            terminalQueue: s.terminalQueue.filter((c) => c.id !== id),
          }));
        }
      },

      logs: [],
      addLog: (entry) =>
        set((s) => {
          const newLog: LogEntry = {
            ...entry,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          };
          const logs = [newLog, ...s.logs].slice(0, 1000);
          return { logs };
        }),
      clearLogs: () => set({ logs: [] }),

      globalLoading: false,
      setGlobalLoading: (val) => set({ globalLoading: val }),
    }),
    {
      name: "arkium-app",
      partialize: (s) => ({
        isFirstRun: s.isFirstRun,
        sidebarCollapsed: s.sidebarCollapsed,
        activeConversationId: s.activeConversationId,
      }),
    }
  )
);

// Listen for online/offline events
if (typeof window !== "undefined") {
  window.addEventListener("online", () => useAppStore.getState().setIsOnline(true));
  window.addEventListener("offline", () => useAppStore.getState().setIsOnline(false));
}
