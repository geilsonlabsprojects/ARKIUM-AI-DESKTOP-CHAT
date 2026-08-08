import { useEffect, useState } from "react";
import {
  Cpu, Download, Trash2, RefreshCw, CheckCircle, Info, Search, Star,
  AlertTriangle, Loader2, HardDrive,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { listModels, checkOllamaStatus, pullModel, deleteModel, getModelInfo } from "../services/ollama";
import { useSettingsStore } from "../stores/settingsStore";
import { invoke } from "@tauri-apps/api/core";
import type { OllamaModel, HardwareInfo } from "../types";
import toast from "react-hot-toast";
import { clsx } from "clsx";

const MODEL_RECOMMENDATIONS = [
  {
    name: "llama3.2",
    description: "Meta's Llama 3.2 — Great all-rounder",
    paramSize: "3B",
    minRamGb: 4,
    tags: ["chat", "code", "fast"],
  },
  {
    name: "llama3.2:1b",
    description: "Tiny but capable — perfect for low-end hardware",
    paramSize: "1B",
    minRamGb: 2,
    tags: ["chat", "fast", "lightweight"],
  },
  {
    name: "mistral",
    description: "Mistral 7B — Excellent reasoning and coding",
    paramSize: "7B",
    minRamGb: 8,
    tags: ["chat", "code", "reasoning"],
  },
  {
    name: "phi3",
    description: "Microsoft Phi-3 — Small model, great performance",
    paramSize: "3.8B",
    minRamGb: 4,
    tags: ["chat", "code", "efficient"],
  },
  {
    name: "codellama",
    description: "Meta CodeLlama — Specialized for coding",
    paramSize: "7B",
    minRamGb: 8,
    tags: ["code", "debug"],
  },
  {
    name: "deepseek-coder-v2",
    description: "DeepSeek Coder V2 — Advanced coding model",
    paramSize: "16B",
    minRamGb: 16,
    tags: ["code"],
  },
  {
    name: "nomic-embed-text",
    description: "Text embeddings model for RAG",
    paramSize: "137M",
    minRamGb: 1,
    tags: ["embeddings", "rag"],
  },
  {
    name: "qwen2.5",
    description: "Alibaba Qwen2.5 — Multilingual, strong coding",
    paramSize: "7B",
    minRamGb: 8,
    tags: ["chat", "code", "multilingual"],
  },
];

export default function ModelsPage() {
  const { t } = useTranslation();
  const { ai: aiSettings, updateAI } = useSettingsStore();

  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [customModelInput, setCustomModelInput] = useState("");
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"installed" | "available">("installed");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
    loadHardware();
  }, []);

  async function loadModels() {
    setLoading(true);
    const list = await listModels();
    setModels(list);
    setLoading(false);
  }

  async function loadHardware() {
    try {
      const hw = await invoke<HardwareInfo>("get_hardware_info");
      setHardwareInfo(hw);
    } catch (e) {
      console.error(e);
    }
  }

  async function handlePull(modelName: string) {
    if (pulling) return;
    setPulling(modelName);
    setPullProgress("Initiating...");
    try {
      await pullModel(modelName, (status) => setPullProgress(status));
      toast.success(`Model '${modelName}' pull initiated! It may take a few minutes.`);
      await loadModels();
    } catch (e) {
      toast.error(`Failed to pull model: ${e}`);
    } finally {
      setPulling(null);
      setPullProgress("");
    }
  }

  async function handleDelete(modelName: string) {
    setDeletingId(modelName);
    try {
      const ok = await deleteModel(modelName);
      if (ok) {
        toast.success(`Model '${modelName}' deleted`);
        setModels((prev) => prev.filter((m) => m.name !== modelName));
        if (aiSettings.defaultModel === modelName) {
          updateAI({ defaultModel: "" });
        }
      }
    } catch (e) {
      toast.error(`Failed to delete model: ${e}`);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  }

  const filteredModels = models.filter((m) =>
    !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMemoryGb = hardwareInfo ? hardwareInfo.totalMemoryMb / 1024 : 0;
  const recommended = MODEL_RECOMMENDATIONS.filter((m) => m.minRamGb <= totalMemoryGb || totalMemoryGb === 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-1">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">{t("models.title")}</h1>
          {hardwareInfo && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {hardwareInfo.cpuBrand} • {(hardwareInfo.totalMemoryMb / 1024).toFixed(1)} GB RAM
              {hardwareInfo.hasGpu && " • GPU detected"}
            </p>
          )}
        </div>
        <button
          onClick={loadModels}
          disabled={loading}
          className="btn-secondary"
        >
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          {t("models.refresh")}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-1 px-6">
        <button
          onClick={() => setActiveTab("installed")}
          className={clsx(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "installed"
              ? "border-arkium-500 text-arkium-300"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          {t("models.installed")} ({models.length})
        </button>
        <button
          onClick={() => setActiveTab("available")}
          className={clsx(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "available"
              ? "border-arkium-500 text-arkium-300"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          {t("models.available")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "installed" ? (
          <>
            {/* Search */}
            {models.length > 3 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search installed models..."
                  className="input-field pl-10"
                />
              </div>
            )}

            {/* Pull custom model */}
            <div className="mb-6 p-4 bg-surface-2 border border-border-1 rounded-xl">
              <h3 className="text-sm font-medium text-zinc-200 mb-3">{t("models.pull_model")}</h3>
              <div className="flex gap-2">
                <input
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && customModelInput && handlePull(customModelInput)}
                  placeholder={t("models.model_name_placeholder")}
                  className="input-field flex-1"
                />
                <button
                  onClick={() => customModelInput && handlePull(customModelInput)}
                  disabled={!customModelInput || !!pulling}
                  className="btn-primary shrink-0"
                >
                  {pulling === customModelInput ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {t("models.download")}
                </button>
              </div>
              {pulling && pullProgress && (
                <p className="text-xs text-zinc-400 mt-2">
                  <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                  {pullProgress}
                </p>
              )}
            </div>

            {/* Models list */}
            {loading ? (
              <div className="flex items-center gap-3 text-zinc-500 text-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading models...
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="text-center py-12">
                <Cpu className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400 mb-1">{t("models.no_models")}</p>
                <p className="text-xs text-zinc-600">{t("models.no_models_hint")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredModels.map((model) => (
                  <ModelCard
                    key={model.name}
                    model={model}
                    isSelected={aiSettings.defaultModel === model.name}
                    isDeleting={deletingId === model.name}
                    confirmDelete={confirmDelete === model.name}
                    onSelect={() => {
                      updateAI({ defaultModel: model.name });
                      toast.success(`Model set to: ${model.name}`);
                    }}
                    onDelete={() => setConfirmDelete(model.name)}
                    onConfirmDelete={() => handleDelete(model.name)}
                    onCancelDelete={() => setConfirmDelete(null)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Recommended */}
            {totalMemoryGb > 0 && (
              <div className="mb-4 p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-300">
                <p className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" />
                  {t("models.recommended")}: Showing models for {totalMemoryGb.toFixed(1)} GB RAM
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {MODEL_RECOMMENDATIONS.map((rec) => {
                const installed = models.some((m) => m.name === rec.name || m.name.startsWith(rec.name + ":"));
                const isRecommended = totalMemoryGb === 0 || rec.minRamGb <= totalMemoryGb;

                return (
                  <div
                    key={rec.name}
                    className={clsx(
                      "p-4 border rounded-xl transition-colors",
                      isRecommended
                        ? "bg-surface-2 border-border-1"
                        : "bg-surface-1 border-border-1 opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-zinc-200 font-mono">{rec.name}</h3>
                          {isRecommended && (
                            <span className="text-xs bg-green-900/40 text-green-400 border border-green-800/50 px-1.5 py-0.5 rounded">
                              Recommended
                            </span>
                          )}
                          {installed && (
                            <span className="text-xs bg-arkium-900/40 text-arkium-300 border border-arkium-800/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Installed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{rec.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
                          <span>{rec.paramSize} params</span>
                          <span>Min {rec.minRamGb} GB RAM</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {rec.tags.map((tag) => (
                            <span key={tag} className="text-xs bg-surface-3 text-zinc-500 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {!installed && (
                        <button
                          onClick={() => handlePull(rec.name)}
                          disabled={!!pulling}
                          className={clsx(
                            "btn-secondary text-xs shrink-0 ml-4",
                            !isRecommended && "opacity-50"
                          )}
                        >
                          {pulling === rec.name ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          Pull
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ModelCard({
  model, isSelected, isDeleting, confirmDelete,
  onSelect, onDelete, onConfirmDelete, onCancelDelete,
}: {
  model: OllamaModel;
  isSelected: boolean;
  isDeleting: boolean;
  confirmDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className={clsx(
      "p-4 border rounded-xl transition-colors",
      isSelected
        ? "border-arkium-600/50 bg-arkium-950/20"
        : "border-border-1 bg-surface-2 hover:border-border-2"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-zinc-400 shrink-0" />
            <h3 className="text-sm font-medium text-zinc-200 font-mono truncate">{model.name}</h3>
            {isSelected && (
              <span className="text-xs bg-arkium-900/40 text-arkium-300 border border-arkium-700/50 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                <CheckCircle className="w-3 h-3" /> Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-600">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              {formatBytes(model.size)}
            </span>
            {model.details?.parameterSize && (
              <span>{model.details.parameterSize}</span>
            )}
            {model.details?.quantizationLevel && (
              <span className="text-zinc-500">{model.details.quantizationLevel}</span>
            )}
            {model.details?.family && (
              <span className="text-zinc-500">{model.details.family}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          {!isSelected && (
            <button onClick={onSelect} className="btn-secondary text-xs py-1">
              {t("models.select")}
            </button>
          )}

          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={onCancelDelete}
                className="text-xs px-2 py-1 text-zinc-400 hover:text-zinc-200 border border-border-1 rounded-lg"
              >
                No
              </button>
              <button
                onClick={onConfirmDelete}
                disabled={isDeleting}
                className="text-xs px-2 py-1 text-red-300 bg-red-950/40 border border-red-800/50 rounded-lg hover:bg-red-900/40"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
              </button>
            </div>
          ) : (
            <button
              onClick={onDelete}
              className="p-1.5 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors"
              title={t("models.delete")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
