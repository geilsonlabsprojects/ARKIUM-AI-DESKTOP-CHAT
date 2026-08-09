import { invoke } from "@tauri-apps/api/core";
import type { SearchResponse, SearchSource } from "../types";
import { useSettingsStore } from "../stores/settingsStore";

// Raw response shape from Rust (snake_case)
interface RawSearchResponse {
  query: string;
  results: SearchSource[];
  engine: string;
  total_results?: number;
  totalResults?: number;
  error?: string;
}

export async function searchWeb(
  query: string,
  overrideEngine?: string
): Promise<SearchResponse> {
  const settings = useSettingsStore.getState().search;
  const engine = overrideEngine ?? settings.engine;
  const maxResults = settings.maxResults;
  const language = settings.language;

  const raw = await invoke<RawSearchResponse>("search_web", {
    query,
    engine,
    maxResults,
    language,
  });

  return {
    query: raw.query,
    results: raw.results,
    engine: raw.engine,
    totalResults: raw.total_results ?? raw.totalResults ?? 0,
    error: raw.error,
  };
}

export async function fetchUrlContent(
  url: string,
  maxChars = 5000
): Promise<{
  title: string;
  content: string;
  url: string;
  success: boolean;
  error?: string;
}> {
  const raw = await invoke<{
    url: string;
    title: string;
    content: string;
    status_code: number;
    success: boolean;
    error?: string;
  }>("fetch_url_content", { url, maxChars });

  return {
    url: raw.url,
    title: raw.title,
    content: raw.content,
    success: raw.success,
    error: raw.error,
  };
}

export function shouldSearchWeb(message: string): boolean {
  const keywords = [
    "search", "look up", "find", "what is", "who is", "when did", "where is",
    "how to", "latest", "current", "today", "news", "price", "weather",
    "best", "top", "compare", "vs", "versus", "recently", "now", "2024", "2025",
    "pesquise", "busque", "buscar", "o que é", "quando", "onde", "como",
    "busca", "recente", "agora",
  ];
  const lower = message.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

export function formatSourcesForContext(sources: SearchSource[]): string {
  if (!sources.length) return "";
  const text = sources
    .slice(0, 5)
    .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.snippet}`)
    .join("\n\n");
  return `\n\n--- WEB SEARCH RESULTS ---\n${text}\n--- END SEARCH RESULTS ---\n\nBased on the above search results, please answer the user's question. Cite sources using [1], [2], etc.`;
}
