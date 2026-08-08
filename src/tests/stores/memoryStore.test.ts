import { describe, it, expect, beforeEach } from "vitest";
import { useMemoryStore } from "../../stores/memoryStore";

beforeEach(() => {
  useMemoryStore.setState({ memories: [], enabled: true });
});

describe("memoryStore", () => {
  it("adds a memory", () => {
    useMemoryStore.getState().addMemory({
      type: "fact",
      key: "user_name",
      value: "Alice",
      importance: 7,
    });
    expect(useMemoryStore.getState().memories).toHaveLength(1);
    expect(useMemoryStore.getState().memories[0].key).toBe("user_name");
    expect(useMemoryStore.getState().memories[0].value).toBe("Alice");
  });

  it("updates a memory", () => {
    useMemoryStore.getState().addMemory({
      type: "preference",
      key: "theme",
      value: "dark",
      importance: 5,
    });
    const id = useMemoryStore.getState().memories[0].id;
    useMemoryStore.getState().updateMemory(id, { value: "light" });
    expect(useMemoryStore.getState().memories[0].value).toBe("light");
  });

  it("deletes a memory", () => {
    useMemoryStore.getState().addMemory({ type: "fact", key: "k", value: "v", importance: 5 });
    const id = useMemoryStore.getState().memories[0].id;
    useMemoryStore.getState().deleteMemory(id);
    expect(useMemoryStore.getState().memories).toHaveLength(0);
  });

  it("clears all memories", () => {
    useMemoryStore.getState().addMemory({ type: "fact", key: "k1", value: "v1", importance: 5 });
    useMemoryStore.getState().addMemory({ type: "fact", key: "k2", value: "v2", importance: 5 });
    useMemoryStore.getState().clearAll();
    expect(useMemoryStore.getState().memories).toHaveLength(0);
  });

  it("enables and disables memory", () => {
    useMemoryStore.getState().setEnabled(false);
    expect(useMemoryStore.getState().enabled).toBe(false);
    useMemoryStore.getState().setEnabled(true);
    expect(useMemoryStore.getState().enabled).toBe(true);
  });

  it("filters by type", () => {
    useMemoryStore.getState().addMemory({ type: "fact", key: "name", value: "Alice", importance: 7 });
    useMemoryStore.getState().addMemory({ type: "preference", key: "color", value: "blue", importance: 5 });
    useMemoryStore.getState().addMemory({ type: "fact", key: "role", value: "dev", importance: 8 });

    const facts = useMemoryStore.getState().getByType("fact");
    expect(facts).toHaveLength(2);
    const prefs = useMemoryStore.getState().getByType("preference");
    expect(prefs).toHaveLength(1);
  });

  it("finds by key", () => {
    useMemoryStore.getState().addMemory({ type: "fact", key: "email", value: "test@example.com", importance: 6 });
    const found = useMemoryStore.getState().getByKey("email");
    expect(found?.value).toBe("test@example.com");
  });

  it("returns undefined for unknown key", () => {
    expect(useMemoryStore.getState().getByKey("nonexistent")).toBeUndefined();
  });

  it("searches memories by query", () => {
    useMemoryStore.getState().addMemory({ type: "fact", key: "project", value: "ARKIUM desktop app", importance: 8 });
    useMemoryStore.getState().addMemory({ type: "preference", key: "language", value: "TypeScript", importance: 5 });

    expect(useMemoryStore.getState().searchMemories("ARKIUM")).toHaveLength(1);
    expect(useMemoryStore.getState().searchMemories("type")).toHaveLength(1);
    expect(useMemoryStore.getState().searchMemories("xyz")).toHaveLength(0);
  });

  it("assigns id and timestamps on add", () => {
    useMemoryStore.getState().addMemory({ type: "fact", key: "k", value: "v", importance: 5 });
    const memory = useMemoryStore.getState().memories[0];
    expect(memory.id).toBeTruthy();
    expect(memory.createdAt).toBeTruthy();
    expect(memory.updatedAt).toBeTruthy();
  });
});
