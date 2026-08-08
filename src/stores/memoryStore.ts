import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Memory, MemoryType } from "../types";

interface MemoryState {
  memories: Memory[];
  enabled: boolean;
  setEnabled: (val: boolean) => void;
  addMemory: (memory: Omit<Memory, "id" | "createdAt" | "updatedAt">) => void;
  updateMemory: (id: string, partial: Partial<Memory>) => void;
  deleteMemory: (id: string) => void;
  clearAll: () => void;
  getByType: (type: MemoryType) => Memory[];
  getByKey: (key: string) => Memory | undefined;
  searchMemories: (query: string) => Memory[];
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],
      enabled: true,

      setEnabled: (val) => set({ enabled: val }),

      addMemory: (partial) => {
        const memory: Memory = {
          ...partial,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ memories: [memory, ...s.memories] }));
      },

      updateMemory: (id, partial) =>
        set((s) => ({
          memories: s.memories.map((m) =>
            m.id === id
              ? { ...m, ...partial, updatedAt: new Date().toISOString() }
              : m
          ),
        })),

      deleteMemory: (id) =>
        set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),

      clearAll: () => set({ memories: [] }),

      getByType: (type) => get().memories.filter((m) => m.type === type),

      getByKey: (key) => get().memories.find((m) => m.key === key),

      searchMemories: (query) => {
        const q = query.toLowerCase();
        return get().memories.filter(
          (m) =>
            m.key.toLowerCase().includes(q) ||
            m.value.toLowerCase().includes(q)
        );
      },
    }),
    { name: "arkium-memory" }
  )
);
