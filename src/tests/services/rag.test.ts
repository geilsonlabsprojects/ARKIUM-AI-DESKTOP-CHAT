import { describe, it, expect, vi, beforeEach } from "vitest";
import { chunkText, formatRagContext } from "../../services/rag";

describe("rag service", () => {
  describe("chunkText", () => {
    it("returns a single chunk for short text", () => {
      const text = "Hello world. This is a short text.";
      const chunks = chunkText(text);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0]).toContain("Hello");
    });

    it("splits long text into multiple chunks", () => {
      // Generate a long text with many sentences
      const longText = Array.from(
        { length: 50 },
        (_, i) => `Sentence number ${i + 1} is here and contains some content.`
      ).join(" ");

      const chunks = chunkText(longText);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it("filters out very short chunks", () => {
      const text = "Hi. Ok. Yes. No.";
      const chunks = chunkText(text);
      // Short chunks (< 20 chars) should be filtered
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeGreaterThanOrEqual(20);
      });
    });

    it("preserves content in chunks", () => {
      const sentences = [
        "The quick brown fox jumps over the lazy dog.",
        "Pack my box with five dozen liquor jugs.",
        "How vexingly quick daft zebras jump.",
      ];
      const text = sentences.join(" ");
      const chunks = chunkText(text);
      const allContent = chunks.join(" ");

      // All original words should appear somewhere
      expect(allContent).toContain("fox");
      expect(allContent).toContain("zebras");
    });

    it("handles empty string", () => {
      const chunks = chunkText("");
      expect(chunks).toEqual([]);
    });

    it("handles text with no sentence boundaries", () => {
      const text = "word".repeat(200);
      const chunks = chunkText(text);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("formatRagContext", () => {
    it("returns empty string for no results", () => {
      expect(formatRagContext([])).toBe("");
    });

    it("formats results with document labels", () => {
      const results = [
        {
          content: "This is relevant content from a document.",
          documentName: "project-readme.md",
          score: 0.85,
        },
        {
          content: "Another piece of relevant information.",
          documentName: "architecture.md",
          score: 0.72,
        },
      ];

      const formatted = formatRagContext(results);

      expect(formatted).toContain("RELEVANT DOCUMENTS");
      expect(formatted).toContain("project-readme.md");
      expect(formatted).toContain("architecture.md");
      expect(formatted).toContain("85%");
      expect(formatted).toContain("72%");
      expect(formatted).toContain("This is relevant content");
      expect(formatted).toContain("Document 1");
      expect(formatted).toContain("Document 2");
    });

    it("includes instruction to answer based on documents", () => {
      const results = [{ content: "Some content.", documentName: "doc.txt", score: 0.9 }];
      const formatted = formatRagContext(results);
      expect(formatted).toContain("Answer based on");
    });
  });
});
