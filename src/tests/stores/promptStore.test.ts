import { describe, it, expect, beforeEach } from "vitest";
import { usePromptStore } from "../../stores/promptStore";
import type { Prompt } from "../../types";

beforeEach(() => {
  usePromptStore.setState({ prompts: [] });
});

function makePrompt(overrides?: Partial<Prompt>): Prompt {
  return {
    id: crypto.randomUUID(),
    title: "Test Prompt",
    content: "Do something useful with {{input}}",
    category: "general",
    tags: ["test"],
    isFavorite: false,
    useCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("promptStore", () => {
  it("adds a prompt", () => {
    const p = makePrompt();
    usePromptStore.getState().addPrompt(p);
    expect(usePromptStore.getState().prompts).toHaveLength(1);
  });

  it("updates a prompt", () => {
    const p = makePrompt({ title: "Original" });
    usePromptStore.getState().addPrompt(p);
    usePromptStore.getState().updatePrompt(p.id, { title: "Updated" });
    expect(usePromptStore.getState().prompts[0].title).toBe("Updated");
  });

  it("deletes a prompt", () => {
    const p = makePrompt();
    usePromptStore.getState().addPrompt(p);
    usePromptStore.getState().deletePrompt(p.id);
    expect(usePromptStore.getState().prompts).toHaveLength(0);
  });

  it("duplicates a prompt", () => {
    const p = makePrompt({ title: "Original", isFavorite: true, useCount: 5 });
    usePromptStore.getState().addPrompt(p);
    usePromptStore.getState().duplicatePrompt(p.id);
    const prompts = usePromptStore.getState().prompts;
    expect(prompts).toHaveLength(2);
    const copy = prompts.find((x) => x.id !== p.id);
    expect(copy?.title).toBe("Original (copy)");
    expect(copy?.isFavorite).toBe(false);
    expect(copy?.useCount).toBe(0);
  });

  it("toggles favorite", () => {
    const p = makePrompt({ isFavorite: false });
    usePromptStore.getState().addPrompt(p);
    usePromptStore.getState().toggleFavorite(p.id);
    expect(usePromptStore.getState().prompts[0].isFavorite).toBe(true);
    usePromptStore.getState().toggleFavorite(p.id);
    expect(usePromptStore.getState().prompts[0].isFavorite).toBe(false);
  });

  it("increments use count", () => {
    const p = makePrompt({ useCount: 0 });
    usePromptStore.getState().addPrompt(p);
    usePromptStore.getState().incrementUseCount(p.id);
    usePromptStore.getState().incrementUseCount(p.id);
    expect(usePromptStore.getState().prompts[0].useCount).toBe(2);
  });

  describe("searchPrompts", () => {
    beforeEach(() => {
      usePromptStore.setState({
        prompts: [
          makePrompt({ title: "Code Review", category: "coding", tags: ["code"] }),
          makePrompt({ title: "Write Essay", category: "writing", tags: ["writing"] }),
          makePrompt({ title: "Debug Python", category: "coding", content: "Fix this python bug" }),
        ],
      });
    });

    it("returns all prompts when query is empty", () => {
      expect(usePromptStore.getState().searchPrompts("")).toHaveLength(3);
    });

    it("filters by title", () => {
      const results = usePromptStore.getState().searchPrompts("Code");
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Code Review");
    });

    it("filters by content", () => {
      const results = usePromptStore.getState().searchPrompts("python");
      expect(results).toHaveLength(1);
    });

    it("filters by category", () => {
      const results = usePromptStore.getState().searchPrompts("", "coding");
      expect(results).toHaveLength(2);
    });

    it("filters by both query and category", () => {
      const results = usePromptStore.getState().searchPrompts("Review", "coding");
      expect(results).toHaveLength(1);
    });

    it("returns empty when no match", () => {
      expect(usePromptStore.getState().searchPrompts("xyz123nonexistent")).toHaveLength(0);
    });
  });
});
