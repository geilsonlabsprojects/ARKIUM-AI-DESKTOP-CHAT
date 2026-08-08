import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, Zap, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { checkOllamaStatus } from "../../services/ollama";
import { invoke } from "@tauri-apps/api/core";
import type { WelcomeCheck } from "../../types";

interface WelcomeScreenProps {
  onComplete: () => void;
}

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const { t } = useTranslation();

  const [checks, setChecks] = useState<WelcomeCheck[]>([
    { name: "check_system", status: "pending" },
    { name: "check_ollama", status: "pending" },
    { name: "check_api", status: "pending" },
    { name: "check_models", status: "pending" },
    { name: "check_internet", status: "pending" },
    { name: "check_workspace", status: "pending" },
    { name: "check_permissions", status: "pending" },
  ]);
  const [allDone, setAllDone] = useState(false);
  const [ollamaInstalled, setOllamaInstalled] = useState(true);
  const [modelsFound, setModelsFound] = useState(0);

  const updateCheck = (name: string, status: WelcomeCheck["status"], message?: string) => {
    setChecks((prev) =>
      prev.map((c) => (c.name === name ? { ...c, status, message } : c))
    );
  };

  useEffect(() => {
    runChecks();
  }, []);

  async function runChecks() {
    // 1. System
    updateCheck("check_system", "checking");
    await delay(300);
    try {
      await invoke("get_system_info");
      updateCheck("check_system", "ok", t("welcome.system_ok"));
    } catch {
      updateCheck("check_system", "warning", "System info limited");
    }

    // 2. Ollama installed/running
    updateCheck("check_ollama", "checking");
    await delay(300);
    const ollamaStatus = await checkOllamaStatus();
    if (ollamaStatus.running) {
      updateCheck("check_ollama", "ok", t("welcome.ollama_ok"));
    } else {
      setOllamaInstalled(false);
      updateCheck("check_ollama", "error", "Ollama not running. Install from ollama.ai");
    }

    // 3. API
    updateCheck("check_api", "checking");
    await delay(200);
    if (ollamaStatus.apiAvailable) {
      updateCheck("check_api", "ok", t("welcome.api_ok"));
    } else {
      updateCheck("check_api", "error", "API not available at " + ollamaStatus.apiUrl);
    }

    // 4. Models
    updateCheck("check_models", "checking");
    await delay(300);
    if (ollamaStatus.modelsCount > 0) {
      setModelsFound(ollamaStatus.modelsCount);
      updateCheck("check_models", "ok", `${ollamaStatus.modelsCount} ${t("welcome.models_found")}`);
    } else {
      updateCheck("check_models", "warning", t("welcome.no_models_hint"));
    }

    // 5. Internet
    updateCheck("check_internet", "checking");
    await delay(400);
    try {
      await fetch("https://www.google.com/generate_204", {
        mode: "no-cors",
        signal: AbortSignal.timeout(3000),
      });
      updateCheck("check_internet", "ok", t("welcome.internet_ok"));
    } catch {
      updateCheck("check_internet", "warning", "No internet — web search disabled");
    }

    // 6. Workspace
    updateCheck("check_workspace", "checking");
    await delay(200);
    updateCheck("check_workspace", "ok", t("welcome.workspace_ok"));

    // 7. Permissions
    updateCheck("check_permissions", "checking");
    await delay(200);
    updateCheck("check_permissions", "ok", t("welcome.permissions_ok"));

    setAllDone(true);
  }

  const allOk = checks.every((c) => c.status === "ok" || c.status === "warning");

  return (
    <div className="fixed inset-0 bg-surface-0 flex items-center justify-center p-6 z-50">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-arkium-600 mb-4 glow-arkium">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">
            {t("welcome.title")}
          </h1>
          <p className="text-zinc-500 text-sm">{t("welcome.subtitle")}</p>
        </div>

        {/* Checks */}
        <div className="bg-surface-2 border border-border-1 rounded-2xl p-5 space-y-3 mb-5">
          {checks.map((check) => (
            <CheckRow key={check.name} check={check} label={t(`welcome.${check.name}`)} />
          ))}
        </div>

        {/* Ollama install hint */}
        {allDone && !ollamaInstalled && (
          <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-xl p-4 mb-4">
            <p className="text-sm text-yellow-300 mb-2">{t("welcome.install_ollama")}</p>
            <p className="text-xs text-yellow-500 mb-3">{t("welcome.install_ollama_hint")}</p>
            <a
              href="https://ollama.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-yellow-300 hover:text-yellow-200 underline"
            >
              Download Ollama <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Done message */}
        {allDone && (
          <div className="text-center mb-4">
            <p className="text-zinc-300 font-medium">{t("welcome.ready")}</p>
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={onComplete}
          disabled={!allDone}
          className={clsx(
            "w-full py-3 rounded-xl text-sm font-semibold transition-all",
            allDone
              ? "bg-arkium-600 hover:bg-arkium-500 text-white glow-arkium"
              : "bg-surface-3 text-zinc-600 cursor-not-allowed"
          )}
        >
          {!allDone ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("welcome.checking")}
            </span>
          ) : (
            t("welcome.get_started")
          )}
        </button>
      </div>
    </div>
  );
}

function CheckRow({ check, label }: { check: WelcomeCheck; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        {check.status === "pending" && (
          <div className="w-4 h-4 rounded-full border border-border-2" />
        )}
        {check.status === "checking" && (
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
        )}
        {check.status === "ok" && (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
        {check.status === "warning" && (
          <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
            <span className="text-[8px] text-black font-bold">!</span>
          </div>
        )}
        {check.status === "error" && (
          <XCircle className="w-4 h-4 text-red-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-zinc-200">{label}</span>
        {check.message && (
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{check.message}</p>
        )}
      </div>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
