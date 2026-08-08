import { useEffect, useState } from "react";
import { Wifi, WifiOff, Cpu, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../stores/appStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { checkOllamaStatus } from "../../services/ollama";
import { clsx } from "clsx";

export default function StatusBar() {
  const { t } = useTranslation();
  const { isOnline, ollamaStatus } = useAppStore();
  const { ai: aiSettings } = useSettingsStore();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const check = async () => {
      setChecking(true);
      await checkOllamaStatus();
      setChecking(false);
    };

    check();
    const interval = setInterval(check, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-surface-1 border-t border-border-1 text-xs text-zinc-500">
      {/* Ollama status */}
      <div className="flex items-center gap-1.5">
        <Circle
          className={clsx(
            "w-2 h-2 fill-current",
            checking ? "text-yellow-500 animate-pulse" :
            ollamaStatus?.apiAvailable ? "text-green-500" : "text-red-500"
          )}
        />
        <span>
          {ollamaStatus?.apiAvailable
            ? `Ollama v${ollamaStatus.version || "?"}`
            : "Ollama offline"}
        </span>
      </div>

      {/* Model */}
      {aiSettings.defaultModel && (
        <>
          <span className="text-border-2">|</span>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3" />
            <span className="truncate max-w-32">{aiSettings.defaultModel}</span>
          </div>
        </>
      )}

      <div className="ml-auto flex items-center gap-3">
        {/* Online status */}
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi className="w-3 h-3 text-green-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-500" />
          )}
          <span>{isOnline ? t("status.ready") : t("status.offline")}</span>
        </div>

        {/* Model count */}
        {ollamaStatus?.modelsCount != null && ollamaStatus.modelsCount > 0 && (
          <span className="text-zinc-600">
            {ollamaStatus.modelsCount} {ollamaStatus.modelsCount === 1 ? "model" : "models"}
          </span>
        )}
      </div>
    </div>
  );
}
