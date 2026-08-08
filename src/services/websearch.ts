import { invoke } from "@tauri-apps/api/core";
import type { SearchResponse, SearchSource } from "../types";
import { useSettingsStore } from "../stores/settingsStore";

export async function searchWeb(
  query: string,
  overrideEngine?: string
): Promise<SearchResponse> {
  const settings = useSettingsStore.getState().search;
  const engine = overrideEngine || settings.engine;
  const maxResults = settings.maxResults;
  const language = settings.language;

  const result = await invoke<SearchResponse>("search_web", {
    query,
    engine,
    maxResults,
    language,
  });

  return {
    query: result.query,
    results: result.results,
    engine: result.engine,
    totalResults: result.total_results ?? result.totalResults ?? 0,
    error: result.error,
  };
}

export async function fetchUrlContent(
  url: string,
  maxChars = 5000
): Promise<{ title: string; content: string; url: string; success: boolean; error?: string }> {
  const result = await invoke<{
    url: string;
    title: string;
    content: string;
    status_code: number;
    success: boolean;
    error?: string;
  }>("fetch_url_content", { url, maxChars });

  return {
    url: result.url,
    title: result.title,
    content: result.content,
    success: result.success,
    error: result.error,
  };
}

export function shouldSearchWeb(message: string): boolean {
  const searchKeywords = [
    "search", "look up", "find", "what is", "who is", "when did", "where is",
    "how to", "latest", "current", "today", "news", "price", "weather",
    "best", "top", "compare", "vs", "versus", "recently", "now", "2024", "2025",
    "pesquise", "busque", "buscar", "o que é", "quando", "onde", "como",
    "busca", "recente", "agora",
  ];

  const lower = message.toLowerCase();
  return searchKeywords.some((kw) => lower.includes(kw));
}

export function formatSourcesForContext(sources: SearchSource[]): string {
  if (!sources.length) return "";

  const sourceTexts = sources
    .slice(0, 5)
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.snippet}`
    )
    .join("\n\n");

  return `\n\n--- WEB SEARCH RESULTS ---\n${sourceTexts}\n--- END SEARCH RESULTS ---\n\nBased on the above search results, please answer the user's question. Cite sources using [1], [2], etc.`;
}
