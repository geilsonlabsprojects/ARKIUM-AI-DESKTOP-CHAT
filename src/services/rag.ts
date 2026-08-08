import { invoke } from "@tauri-apps/api/core";
import { generateEmbeddings } from "./ollama";
import { useSettingsStore } from "../stores/settingsStore";
import type { IndexedDocument } from "../types";

const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 64;

export function chunkText(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).length <= CHUNK_SIZE) {
      current = current ? current + " " + sentence : sentence;
    } else {
      if (current) {
        chunks.push(current.trim());
        // Overlap: keep last portion
        const words = current.split(" ");
        const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 5));
        current = overlapWords.join(" ") + " " + sentence;
      } else {
        // Sentence itself is too long, split by words
        const words = sentence.split(" ");
        let wordChunk = "";
        for (const word of words) {
          if ((wordChunk + " " + word).length <= CHUNK_SIZE) {
            wordChunk = wordChunk ? wordChunk + " " + word : word;
          } else {
            if (wordChunk) chunks.push(wordChunk.trim());
            wordChunk = word;
          }
        }
        current = wordChunk;
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 20);
}

export async function indexDocument(
  path: string,
  name: string,
  content: string,
  docType: string,
  embeddingModel?: string
): Promise<IndexedDocument> {
  const model = embeddingModel ||
    useSettingsStore.getState().ai.defaultModel ||
    "nomic-embed-text";

  const chunks = chunkText(content);

  // Generate embeddings for each chunk
  const embeddings: number[][] = [];
  for (const chunk of chunks) {
    const embedding = await generateEmbeddings(model, chunk);
    embeddings.push(embedding);
  }

  const result = await invoke<IndexedDocument>("index_document", {
    path,
    name,
    content,
    docType,
    embeddings,
    chunks,
  });

  return result;
}

export async function searchDocuments(
  query: string,
  maxResults = 5,
  threshold = 0.3,
  embeddingModel?: string
): Promise<Array<{
  content: string;
  documentName: string;
  documentPath: string;
  score: number;
}>> {
  const model = embeddingModel ||
    useSettingsStore.getState().ai.defaultModel ||
    "nomic-embed-text";

  const queryEmbedding = await generateEmbeddings(model, query);

  const results = await invoke<Array<{
    chunk: { content: string };
    score: number;
    document_name: string;
    document_path: string;
  }>>("search_documents", {
    queryEmbedding,
    maxResults,
    threshold,
  });

  return results.map((r) => ({
    content: r.chunk.content,
    documentName: r.document_name,
    documentPath: r.document_path,
    score: r.score,
  }));
}

export async function listIndexedDocuments(): Promise<IndexedDocument[]> {
  return invoke<IndexedDocument[]>("list_indexed_documents");
}

export async function deleteIndexedDocument(documentId: string): Promise<boolean> {
  return invoke<boolean>("delete_indexed_document", { documentId });
}

export function formatRagContext(
  results: Array<{ content: string; documentName: string; score: number }>
): string {
  if (!results.length) return "";

  const context = results
    .map(
      (r, i) =>
        `[Document ${i + 1}: ${r.documentName} (relevance: ${(r.score * 100).toFixed(0)}%)]\n${r.content}`
    )
    .join("\n\n");

  return `\n\n--- RELEVANT DOCUMENTS ---\n${context}\n--- END DOCUMENTS ---\n\nAnswer based on the above documents when relevant.`;
}
