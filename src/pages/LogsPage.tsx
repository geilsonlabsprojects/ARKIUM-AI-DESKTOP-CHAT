import { useState } from "react";
import { ScrollText, Trash2, Filter, Download, AlertCircle, Info, AlertTriangle, Bug } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../stores/appStore";
import { clsx } from "clsx";
import type { LogLevel } from "../types";
import { formatDistanceToNow } from "date-fns";

const LEVEL_CONFIG: Record<LogLevel, { icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  debug: { icon: Bug, color: "text-zinc-500", bg: "bg-zinc-900/20" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-950/20" },
  warn: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-950/20" },
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-950/20" },
};

export default function LogsPage() {
  const { t } = useTranslation();
  const { logs, clearLogs } = useAppStore();
  const [filter, setFilter] = useState<LogLevel | "all">("all");

  const filtered = logs.filter((l) => filter === "all" || l.level === filter);

  function handleExport() {
    const content = filtered
      .map((l) => `[${l.createdAt}] [${l.level.toUpperCase()}] ${l.source}: ${l.message}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arkium-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-1">
        <h1 className="text-lg font-semibold text-zinc-100">{t("nav.logs")}</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={() => {
              if (window.confirm("Clear all logs?")) clearLogs();
            }}
            className="btn-danger text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 px-6 py-3 border-b border-border-1">
        {(["all", "debug", "info", "warn", "error"] as const).map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={clsx(
              "px-3 py-1 text-xs rounded-lg transition-colors capitalize",
              filter === level
                ? "bg-surface-3 text-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {level}
            {level !== "all" && (
              <span className="ml-1 text-zinc-600">
                ({logs.filter((l) => l.level === level).length})
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-600">{filtered.length} entries</span>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-600">
            <ScrollText className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
            <p>No logs yet</p>
          </div>
        ) : (
          filtered.map((log) => {
            const cfg = LEVEL_CONFIG[log.level];
            const Icon = cfg.icon;
            return (
              <div
                key={log.id}
                className={clsx(
                  "flex items-start gap-3 px-4 py-2 border-b border-border-1/30 hover:bg-surface-1/50",
                  cfg.bg
                )}
              >
                <Icon className={clsx("w-3.5 h-3.5 shrink-0 mt-0.5", cfg.color)} />
                <div className="flex-1 min-w-0">
                  <span className={clsx("font-semibold", cfg.color)}>[{log.level.toUpperCase()}]</span>
                  {log.source && <span className="text-zinc-600 ml-1">[{log.source}]</span>}
                  <span className="text-zinc-300 ml-1.5">{log.message}</span>
                </div>
                <span className="text-zinc-700 shrink-0">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
