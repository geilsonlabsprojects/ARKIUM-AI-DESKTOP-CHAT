import { describe, it, expect, beforeEach } from "vitest";
import { saveMemory, getMemoryContext, extractMemoriesFromConversation } from "../../services/memory";
import { useMemoryStore } from "../../stores/memoryStore";

beforeEach(() => {
  useMemoryStore.setState({ memories: [], enabled: true });
});

describe("memory service", () => {
  describe("saveMemory", () => {
    it("adds a new memory", () => {
      saveMemory("fact", "user_name", "Alice");
      expect(useMemoryStore.getState().memories).toHaveLength(1);
      expect(useMemoryStore.getState().memories[0].value).toBe("Alice");
    });

    it("updates existing memory with same key and type", () => {
      saveMemory("fact", "user_name", "Alice");
      saveMemory("fact", "user_name", "Bob");
      expect(useMemoryStore.getState().memories).toHaveLength(1);
      expect(useMemoryStore.getState().memories[0].value).toBe("Bob");
    });

    it("does not save when memory is disabled", () => {
      useMemoryStore.setState({ enabled: false });
      saveMemory("fact", "key", "value");
      expect(useMemoryStore.getState().memories).toHaveLength(0);
    });

    it("saves with conversationId option", () => {
      saveMemory("conversation", "topic", "AI", { conversationId: "conv-123" });
      expect(useMemoryStore.getState().memories[0].conversationId).toBe("conv-123");
    });
  });

  describe("getMemoryContext", () => {
    it("returns empty string when no memories", () => {
      expect(getMemoryContext()).toBe("");
    });

    it("returns empty string when memory is disabled", () => {
      useMemoryStore.setState({ enabled: false });
      saveMemory("preference", "theme", "dark");
      expect(getMemoryContext()).toBe("");
    });

    it("includes preference memories in context", () => {
      useMemoryStore.setState({ enabled: true });
      saveMemory("preference", "coding_language", "TypeScript");
      const ctx = getMemoryContext();
      expect(ctx).toContain("coding_language");
      expect(ctx).toContain("TypeScript");
    });

    it("includes high-importance facts", () => {
      useMemoryStore.setState({ enabled: true });
      saveMemory("fact", "critical_info", "important data", { importance: 9 });
      const ctx = getMemoryContext();
      expect(ctx).toContain("critical_info");
    });

    it("excludes low-importance facts", () => {
      useMemoryStore.setState({ enabled: true });
      saveMemory("fact", "minor_info", "unimportant", { importance: 3 });
      const ctx = getMemoryContext();
      // Low importance facts (< 7) should not be included
      expect(ctx).toBe("");
    });

    it("returns Memory Context header when memories present", () => {
      useMemoryStore.setState({ enabled: true });
      saveMemory("preference", "lang", "en");
      const ctx = getMemoryContext();
      expect(ctx).toContain("Memory Context");
    });
  });

  describe("extractMemoriesFromConversation", () => {
    it("extracts user name from conversation", () => {
      extractMemoriesFromConversation(
        "My name is Charlie",
        "Nice to meet you, Charlie!",
        "conv-1"
      );
      const memories = useMemoryStore.getState().memories;
      const nameMem = memories.find((m) => m.key === "user_name");
      expect(nameMem?.value).toBe("Charlie");
    });

    it("does not extract anything when memory is disabled", () => {
      useMemoryStore.setState({ enabled: false });
      extractMemoriesFromConversation("My name is Dave", "Hello Dave!", "conv-2");
      expect(useMemoryStore.getState().memories).toHaveLength(0);
    });

    it("handles conversations with no extractable info", () => {
      extractMemoriesFromConversation(
        "What is 2 + 2?",
        "4",
        "conv-3"
      );
      // Should not crash, may or may not extract anything
      expect(true).toBe(true);
    });
  });
});
