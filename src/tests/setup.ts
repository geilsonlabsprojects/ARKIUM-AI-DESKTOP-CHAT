/// <reference types="vitest/globals" />
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Tauri APIs — these are not available in JSDOM
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(), save: vi.fn(), message: vi.fn(), ask: vi.fn(), confirm: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(), writeFile: vi.fn(), readDir: vi.fn(), mkdir: vi.fn(),
  remove: vi.fn(), exists: vi.fn(), copyFile: vi.fn(), rename: vi.fn(), stat: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-os", () => ({
  platform: vi.fn().mockResolvedValue("windows"),
  version: vi.fn().mockResolvedValue("11.0"),
  arch: vi.fn().mockResolvedValue("x86_64"),
}));

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: vi.fn().mockResolvedValue({
      execute: vi.fn().mockResolvedValue({ rowsAffected: 0, lastInsertId: 0 }),
      select: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock("@tauri-apps/plugin-store", () => ({
  Store: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockResolvedValue(false),
    delete: vi.fn().mockResolvedValue(false),
    entries: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock global fetch
(globalThis as typeof globalThis & { fetch: unknown }).fetch = vi.fn();

// Mock crypto.randomUUID
Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: (): string => "test-uuid-" + Math.random().toString(36).slice(2),
    getRandomValues: (arr: Uint8Array): Uint8Array => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    },
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => { store[key] = value; },
    removeItem: (key: string): void => { delete store[key]; },
    clear: (): void => { store = {}; },
    get length(): number { return Object.keys(store).length; },
    key: (i: number): string | null => Object.keys(store)[i] ?? null,
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });

// Suppress console.error in tests
const originalConsoleError = console.error;
beforeEach(() => { console.error = vi.fn(); });
afterEach(() => { console.error = originalConsoleError; });
