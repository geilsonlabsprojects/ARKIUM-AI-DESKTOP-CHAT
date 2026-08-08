import { useState } from "react";
import { Search, Globe, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { searchWeb, fetchUrlContent } from "../services/websearch";
import { useAppStore } from "../stores/appStore";
import { useSettingsStore } from "../stores/settingsStore";
import type { SearchSource } from "../types";
import { clsx } from "clsx";

export default function SearchPage() {
  const { t } = useTranslation();
  const { isOnline } = useAppStore();
  const { search: searchSettings } = useSettingsStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const [engine, setEngine] = useState(searchSettings.engine);

  async function handleSearch() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setSelectedUrl(null);
    setPageContent(null);

    try {
      const result = await searchWeb(query, engine);
      if (result.error) {
        setError(result.error);
      } else {
        setResults(result.results);
        if (result.results.length === 0) {
          setError("No results found. Try a different query.");
        }
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchPage(url: string) {
    setSelectedUrl(url);
    setLoadingPage(true);
    setPageContent(null);
    try {
      const result = await fetchUrlContent(url, 8000);
      if (result.success) {
        setPageContent(`# ${result.title}\n\n${result.content}`);
      } else {
        setPageContent(`Error fetching page: ${result.error}`);
      }
    } catch (e) {
      setPageContent(`Error: ${e}`);
    } finally {
      setLoadingPage(false);
    }
  }

  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
        <Globe className="w-10 h-10 text-zinc-700" />
        <p>{t("status.offline")}</p>
        <p className="text-xs">Internet connection required for web search</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-1">
        <h1 className="text-lg font-semibold text-zinc-100 mb-3">{t("nav.search")}</h1>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search the web..."
              className="input-field pl-10"
            />
          </div>
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as typeof engine)}
            className="input-field w-36"
          >
            <option value="duckduckgo">DuckDuckGo</option>
            <option value="brave">Brave</option>
            <option value="searxng">SearXNG</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || loading}
            className="btn-primary"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-1 overflow-hidden">
        {/* Search results */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-800/50 rounded-xl text-sm text-red-400 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 text-zinc-500 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              Searching {engine}...
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-600 mb-3">
                {results.length} results from {engine}
              </p>
              {results.map((result, i) => (
                <div
                  key={i}
                  className={clsx(
                    "p-4 border rounded-xl cursor-pointer transition-colors",
                    selectedUrl === result.url
                      ? "border-arkium-600/50 bg-arkium-950/20"
                      : "border-border-1 bg-surface-2 hover:border-border-2"
                  )}
                  onClick={() => handleFetchPage(result.url)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-blue-400 hover:text-blue-300 truncate">
                        {result.title}
                      </h3>
                      <p className="text-xs text-green-600 truncate mt-0.5">{result.url}</p>
                      {result.snippet && (
                        <p className="text-xs text-zinc-400 mt-1.5 line-clamp-3">{result.snippet}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-zinc-600">
                        <span>{result.domain}</span>
                        {result.publishedDate && <span>• {result.publishedDate}</span>}
                      </div>
                    </div>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-zinc-600 hover:text-zinc-300 p-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="text-center py-16">
              <Globe className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">Search the web for real-time information</p>
            </div>
          )}
        </div>

        {/* Page content panel */}
        {selectedUrl && (
          <div className="w-96 flex flex-col border-l border-border-1 bg-surface-1">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-1">
              <span className="text-xs text-zinc-400 truncate">{selectedUrl}</span>
              <button onClick={() => { setSelectedUrl(null); setPageContent(null); }} className="text-zinc-600 hover:text-zinc-300 shrink-0 ml-2">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingPage ? (
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading page...
                </div>
              ) : (
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {pageContent}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
