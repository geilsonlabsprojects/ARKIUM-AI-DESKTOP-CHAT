import { describe, it, expect, vi, beforeEach } from "vitest";
import { shouldSearchWeb, formatSourcesForContext } from "../../services/websearch";
import type { SearchSource } from "../../types";

describe("websearch utils", () => {
  describe("shouldSearchWeb", () => {
    it("detects search intent from English keywords", () => {
      expect(shouldSearchWeb("Search for the latest AI models")).toBe(true);
      expect(shouldSearchWeb("What is the current price of Bitcoin?")).toBe(true);
      expect(shouldSearchWeb("Find information about React hooks")).toBe(true);
      expect(shouldSearchWeb("Who is the president of France?")).toBe(true);
      expect(shouldSearchWeb("Latest news about TypeScript")).toBe(true);
      expect(shouldSearchWeb("How to install Docker on Ubuntu")).toBe(true);
    });

    it("detects search intent from Portuguese keywords", () => {
      expect(shouldSearchWeb("Pesquise os melhores modelos de IA")).toBe(true);
      expect(shouldSearchWeb("O que é machine learning?")).toBe(true);
      expect(shouldSearchWeb("Busque informações sobre Ollama")).toBe(true);
    });

    it("does not trigger search for general questions", () => {
      expect(shouldSearchWeb("Hello, how are you?")).toBe(false);
      expect(shouldSearchWeb("Write a poem about spring")).toBe(false);
      expect(shouldSearchWeb("Explain recursion to me")).toBe(false);
      expect(shouldSearchWeb("Fix this code snippet")).toBe(false);
    });

    it("is case insensitive", () => {
      expect(shouldSearchWeb("SEARCH for something")).toBe(true);
      expect(shouldSearchWeb("WHAT IS React?")).toBe(true);
    });
  });

  describe("formatSourcesForContext", () => {
    const mockSources: SearchSource[] = [
      {
        title: "Introduction to AI",
        url: "https://example.com/ai",
        snippet: "Artificial intelligence is transforming the world.",
        domain: "example.com",
        source: "duckduckgo",
      },
      {
        title: "Machine Learning Guide",
        url: "https://ml.example.com/guide",
        snippet: "Machine learning enables computers to learn from data.",
        domain: "ml.example.com",
        source: "duckduckgo",
      },
    ];

    it("returns empty string for empty sources", () => {
      expect(formatSourcesForContext([])).toBe("");
    });

    it("formats sources with numbered references", () => {
      const result = formatSourcesForContext(mockSources);
      expect(result).toContain("[1]");
      expect(result).toContain("[2]");
      expect(result).toContain("Introduction to AI");
      expect(result).toContain("Machine Learning Guide");
      expect(result).toContain("https://example.com/ai");
    });

    it("includes WEB SEARCH RESULTS header", () => {
      const result = formatSourcesForContext(mockSources);
      expect(result).toContain("WEB SEARCH RESULTS");
    });

    it("limits to 5 sources", () => {
      const manySources: SearchSource[] = Array.from({ length: 10 }, (_, i) => ({
        title: `Source ${i}`,
        url: `https://example${i}.com`,
        snippet: "snippet",
        domain: `example${i}.com`,
        source: "duckduckgo",
      }));
      const result = formatSourcesForContext(manySources);
      expect(result).toContain("[5]");
      expect(result).not.toContain("[6]");
    });
  });
});
