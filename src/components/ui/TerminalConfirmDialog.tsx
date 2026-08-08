import { Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../stores/appStore";

export default function TerminalConfirmDialog() {
  const { t } = useTranslation();
  const { terminalQueue, resolveTerminalCommand } = useAppStore();

  const current = terminalQueue[0];
  if (!current) return null;

  const fullCommand = [current.command, ...(current.args || [])].join(" ");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-2 border border-border-1 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border-1 border-red-800/30 bg-red-950/20 rounded-t-2xl">
          <Terminal className="w-5 h-5 text-red-400" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              {t("terminal.confirm_title")}
            </h2>
            <p className="text-xs text-zinc-400">High risk operation</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-zinc-400 mb-3">
            {t("terminal.confirm_desc")}
          </p>

          <div className="bg-surface-0 border border-border-2 rounded-lg p-3">
            <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap break-all">
              $ {fullCommand}
            </pre>
            {current.cwd && (
              <p className="text-xs text-zinc-500 mt-1">Working dir: {current.cwd}</p>
            )}
          </div>

          <div className="mt-3 p-3 bg-yellow-950/30 border border-yellow-800/40 rounded-lg">
            <p className="text-xs text-yellow-400">
              ⚠️ This command will be executed on your system. Only allow if you trust the source.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={() => resolveTerminalCommand(current.id, false)}
            className="flex-1 btn-secondary justify-center"
          >
            {t("terminal.cancel")}
          </button>
          <button
            onClick={() => resolveTerminalCommand(current.id, true)}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Terminal className="w-4 h-4" />
            {t("terminal.execute")}
          </button>
        </div>
      </div>
    </div>
  );
}
