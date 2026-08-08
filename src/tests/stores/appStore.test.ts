import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAppStore } from "../../stores/appStore";
import type { PermissionRequest } from "../../types";

beforeEach(() => {
  useAppStore.setState({
    isFirstRun: true,
    ollamaStatus: null,
    isOnline: true,
    sidebarCollapsed: false,
    activeConversationId: null,
    permissionQueue: [],
    terminalQueue: [],
    logs: [],
    globalLoading: false,
  });
});

describe("appStore", () => {
  describe("first run", () => {
    it("starts as first run", () => {
      expect(useAppStore.getState().isFirstRun).toBe(true);
    });

    it("sets first run to false", () => {
      useAppStore.getState().setFirstRun(false);
      expect(useAppStore.getState().isFirstRun).toBe(false);
    });
  });

  describe("sidebar", () => {
    it("toggles sidebar", () => {
      expect(useAppStore.getState().sidebarCollapsed).toBe(false);
      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().sidebarCollapsed).toBe(true);
      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe("conversations", () => {
    it("sets active conversation", () => {
      useAppStore.getState().setActiveConversationId("conv-123");
      expect(useAppStore.getState().activeConversationId).toBe("conv-123");
    });

    it("clears active conversation", () => {
      useAppStore.getState().setActiveConversationId("conv-123");
      useAppStore.getState().setActiveConversationId(null);
      expect(useAppStore.getState().activeConversationId).toBeNull();
    });
  });

  describe("permission queue", () => {
    it("pushes permission request", () => {
      const req: PermissionRequest = {
        id: "perm-1",
        action: "delete_file",
        resource: "/home/user/file.txt",
        description: "Delete a file",
        riskLevel: "high",
        resolve: vi.fn(),
      };
      useAppStore.getState().pushPermission(req);
      expect(useAppStore.getState().permissionQueue).toHaveLength(1);
      expect(useAppStore.getState().permissionQueue[0].id).toBe("perm-1");
    });

    it("resolves and removes permission from queue", () => {
      const resolveFn = vi.fn();
      const req: PermissionRequest = {
        id: "perm-2",
        action: "write_file",
        resource: "/test.txt",
        description: "Write a file",
        riskLevel: "medium",
        resolve: resolveFn,
      };
      useAppStore.getState().pushPermission(req);
      useAppStore.getState().resolvePermission("perm-2", true, false);
      expect(resolveFn).toHaveBeenCalledWith(true, false);
      expect(useAppStore.getState().permissionQueue).toHaveLength(0);
    });

    it("handles multiple permissions in queue", () => {
      for (let i = 0; i < 3; i++) {
        useAppStore.getState().pushPermission({
          id: `perm-${i}`,
          action: "read_file",
          resource: `/file${i}.txt`,
          description: "Read",
          riskLevel: "low",
          resolve: vi.fn(),
        });
      }
      expect(useAppStore.getState().permissionQueue).toHaveLength(3);
      useAppStore.getState().resolvePermission("perm-1", false, false);
      expect(useAppStore.getState().permissionQueue).toHaveLength(2);
    });
  });

  describe("logs", () => {
    it("adds a log entry", () => {
      useAppStore.getState().addLog({
        level: "info",
        message: "Test log message",
        source: "test",
      });
      expect(useAppStore.getState().logs).toHaveLength(1);
      expect(useAppStore.getState().logs[0].message).toBe("Test log message");
      expect(useAppStore.getState().logs[0].level).toBe("info");
    });

    it("assigns id and timestamp to log entries", () => {
      useAppStore.getState().addLog({ level: "debug", message: "debug", source: "test" });
      const entry = useAppStore.getState().logs[0];
      expect(entry.id).toBeTruthy();
      expect(entry.createdAt).toBeTruthy();
    });

    it("clears logs", () => {
      useAppStore.getState().addLog({ level: "info", message: "msg1", source: "test" });
      useAppStore.getState().addLog({ level: "warn", message: "msg2", source: "test" });
      useAppStore.getState().clearLogs();
      expect(useAppStore.getState().logs).toHaveLength(0);
    });

    it("limits log entries to 1000", () => {
      for (let i = 0; i < 1010; i++) {
        useAppStore.getState().addLog({ level: "info", message: `log ${i}`, source: "test" });
      }
      expect(useAppStore.getState().logs.length).toBeLessThanOrEqual(1000);
    });
  });

  describe("ollama status", () => {
    it("sets ollama status", () => {
      const status = {
        installed: true,
        running: true,
        apiAvailable: true,
        apiUrl: "http://localhost:11434",
        modelsCount: 3,
        version: "0.3.0",
      };
      useAppStore.getState().setOllamaStatus(status);
      expect(useAppStore.getState().ollamaStatus).toEqual(status);
    });

    it("clears ollama status", () => {
      useAppStore.getState().setOllamaStatus(null);
      expect(useAppStore.getState().ollamaStatus).toBeNull();
    });
  });
});
