import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Send, Square, Paperclip, Globe, Bot, ChevronDown, X, File } from "lucide-react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { listModels } from "../../services/ollama";
import { useSettingsStore } from "../../stores/settingsStore";
import type { OllamaModel, Attachment } from "../../types";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";

interface ChatInputProps {
  onSend: (
    message: string,
    attachments: Attachment[],
    useSearch: boolean,
    useAgent: boolean
  ) => void;
  onStop?: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export default function ChatInput({
  onSend,
  onStop,
  isGenerating,
  disabled,
}: ChatInputProps) {
  const { t } = useTranslation();
  const { ai: aiSettings, updateAI } = useSettingsStore();

  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [useSearch, setUseSearch] = useState(false);
  const [useAgent, setUseAgent] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!message.trim() || isGenerating || disabled) return;
    onSend(message.trim(), attachments, useSearch, useAgent);
    setMessage("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [message, attachments, useSearch, useAgent, isGenerating, disabled, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  };

  const handleAttach = async () => {
    try {
      // open() with multiple:true always returns string[] | null in Tauri v2
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Supported Files",
            extensions: [
              "txt", "md", "json", "yaml", "yml", "js", "ts", "tsx", "jsx",
              "py", "rs", "java", "c", "cpp", "h", "csv", "html", "css",
              "sh", "bat", "ps1",
            ],
          },
        ],
      });
      if (!selected) return;

      // Tauri v2: open({multiple:true}) returns string[] | null
      const files: string[] = Array.isArray(selected) ? selected : [selected as string];

      for (const filePath of files) {
        const bytes: Uint8Array = await readFile(filePath);
        const content = new TextDecoder().decode(bytes);
        const name = filePath.replace(/\\/g, "/").split("/").pop() ?? "file";
        setAttachments((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name,
            path: filePath,
            content,
            mimeType: "text/plain",
            size: bytes.length,
          },
        ]);
      }
    } catch (e) {
      console.error("Failed to attach file:", e);
    }
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const openModelPicker = async () => {
    setShowModelPicker(true);
    if (models.length === 0) {
      setLoadingModels(true);
      const list = await listModels();
      setModels(list);
      setLoadingModels(false);
    }
  };

  return (
    <div className="p-3 border-t border-border-1 bg-surface-1">
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 px-2 py-1 bg-surface-3 border border-border-1 rounded-lg text-xs text-zinc-300"
            >
              <File className="w-3 h-3 text-arkium-400" />
              <span className="max-w-32 truncate">{att.name}</span>
              <button onClick={() => removeAttachment(att.id)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input box */}
      <div className="flex flex-col bg-surface-2 border border-border-1 focus-within:border-arkium-500/50 rounded-xl transition-colors">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={
            !aiSettings.defaultModel
              ? t("chat.no_model") + " — go to Models to select one"
              : t("chat.placeholder")
          }
          disabled={isGenerating || disabled}
          rows={1}
          className="flex-1 px-4 pt-3 pb-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none min-h-[44px] max-h-[200px]"
        />

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 pb-2">
          {/* Attach */}
          <button
            onClick={handleAttach}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-surface-3 transition-colors"
            title={t("chat.attach")}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Web Search */}
          <button
            onClick={() => setUseSearch(!useSearch)}
            className={clsx(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors",
              useSearch
                ? "bg-blue-900/40 text-blue-300 border border-blue-800/50"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-surface-3"
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t("chat.web_search")}</span>
          </button>

          {/* Agent */}
          <button
            onClick={() => setUseAgent(!useAgent)}
            className={clsx(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors",
              useAgent
                ? "bg-purple-900/40 text-purple-300 border border-purple-800/50"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-surface-3"
            )}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{t("chat.agent_mode")}</span>
          </button>

          {/* Model picker */}
          <div className="relative ml-auto">
            <button
              onClick={openModelPicker}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-surface-3 rounded-lg transition-colors max-w-36"
            >
              <span className="truncate">
                {aiSettings.defaultModel || t("chat.select_model")}
              </span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>

            {showModelPicker && (
              <div className="absolute bottom-full right-0 mb-2 w-56 bg-surface-3 border border-border-1 rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border-1">
                  <span className="text-xs font-medium text-zinc-300">Select Model</span>
                  <button onClick={() => setShowModelPicker(false)}>
                    <X className="w-3.5 h-3.5 text-zinc-500" />
                  </button>
                </div>
                {loadingModels ? (
                  <div className="px-3 py-4 text-xs text-zinc-500 text-center">Loading models...</div>
                ) : models.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-zinc-500 text-center">
                    No models found. Go to Models to pull one.
                  </div>
                ) : (
                  models.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => {
                        updateAI({ defaultModel: m.name });
                        setShowModelPicker(false);
                      }}
                      className={clsx(
                        "w-full text-left px-3 py-2 text-xs hover:bg-surface-4 transition-colors",
                        aiSettings.defaultModel === m.name ? "text-arkium-300" : "text-zinc-300"
                      )}
                    >
                      <div className="font-medium">{m.name}</div>
                      <div className="text-zinc-500">
                        {m.details?.parameterSize} • {formatBytes(m.size)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Send / Stop */}
          {isGenerating ? (
            <button
              onClick={onStop}
              className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shrink-0"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!message.trim() || disabled || !aiSettings.defaultModel}
              className={clsx(
                "p-1.5 rounded-lg transition-colors shrink-0",
                message.trim() && aiSettings.defaultModel
                  ? "bg-arkium-600 hover:bg-arkium-500 text-white"
                  : "bg-surface-4 text-zinc-600 cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4" />
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
