import { useState } from "react";
import {
  BookText, Plus, Star, StarOff, Copy, Trash2, Edit2, Search,
  Wand2, ChevronDown, Check, Tag, Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import type { Prompt, PromptCategory } from "../types";
import { usePromptStore } from "../stores/promptStore";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../stores/chatStore";
import { useAppStore } from "../stores/appStore";
import { useSettingsStore } from "../stores/settingsStore";
import { improvePrompt } from "../services/promptImprover";
import toast from "react-hot-toast";

const CATEGORIES: { value: PromptCategory | "all"; label: string; color: string }[] = [
  { value: "all", label: "All", color: "text-zinc-400" },
  { value: "general", label: "General", color: "text-zinc-300" },
  { value: "coding", label: "Coding", color: "text-blue-400" },
  { value: "writing", label: "Writing", color: "text-green-400" },
  { value: "analysis", label: "Analysis", color: "text-yellow-400" },
  { value: "creative", label: "Creative", color: "text-pink-400" },
  { value: "research", label: "Research", color: "text-purple-400" },
  { value: "custom", label: "Custom", color: "text-orange-400" },
];

export default function PromptsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    prompts, addPrompt, updatePrompt, deletePrompt, duplicatePrompt,
    toggleFavorite, incrementUseCount, searchPrompts,
  } = usePromptStore();

  const { addConversation, addMessage, setActiveConversationId } = useChatStore();
  const { setActiveConversationId: setActiveConv } = useAppStore();
  const { ai: aiSettings } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<PromptCategory | "all">("all");
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [improvingId, setImprovingId] = useState<string | null>(null);
  const [improvedContent, setImprovedContent] = useState("");

  const filtered = searchPrompts(
    searchQuery,
    activeCategory === "all" ? undefined : activeCategory
  );

  function handleUsePrompt(prompt: Prompt) {
    incrementUseCount(prompt.id);
    const convId = crypto.randomUUID();
    const now = new Date().toISOString();
    addConversation({
      id: convId,
      title: prompt.title,
      model: aiSettings.defaultModel,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    });
    setActiveConversationId(convId);
    navigate(`/chat/${convId}`);
    // Note: message will be pre-filled in chat via query param in a production app
    toast.success("Prompt loaded in chat");
  }

  async function handleImprove(prompt: Prompt) {
    if (!aiSettings.defaultModel) {
      toast.error("Please select a model first");
      return;
    }
    setImprovingId(prompt.id);
    setImprovedContent("");

    const abortCtrl = new AbortController();

    await improvePrompt(
      prompt.content,
      (chunk) => setImprovedContent((prev) => prev + chunk),
      () => {
        setImprovingId(null);
        toast.success(t("prompts.improved"));
      },
      (err) => {
        setImprovingId(null);
        toast.error(`Failed to improve: ${err}`);
      },
      abortCtrl.signal
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-1">
        <h1 className="text-lg font-semibold text-zinc-100">{t("prompts.title")}</h1>
        <button
          onClick={() => {
            setEditingPrompt(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          {t("prompts.new")}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Categories */}
        <div className="w-40 shrink-0 border-r border-border-1 py-3">
          {CATEGORIES.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setActiveCategory(value)}
              className={clsx(
                "w-full text-left px-4 py-2 text-sm transition-colors",
                activeCategory === value
                  ? "bg-surface-3 text-zinc-100"
                  : `${color} hover:bg-surface-2`
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="px-4 py-3 border-b border-border-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("prompts.search")}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Prompt list */}
          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <BookText className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">{t("prompts.no_prompts")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filtered.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    isImproving={improvingId === prompt.id}
                    improvedContent={improvingId === prompt.id ? improvedContent : ""}
                    onUse={() => handleUsePrompt(prompt)}
                    onEdit={() => {
                      setEditingPrompt(prompt);
                      setShowForm(true);
                    }}
                    onDuplicate={() => {
                      duplicatePrompt(prompt.id);
                      toast.success("Prompt duplicated");
                    }}
                    onFavorite={() => toggleFavorite(prompt.id)}
                    onDelete={() => {
                      if (window.confirm(`Delete "${prompt.title}"?`)) {
                        deletePrompt(prompt.id);
                        toast.success("Prompt deleted");
                      }
                    }}
                    onImprove={() => handleImprove(prompt)}
                    onSaveImproved={() => {
                      if (improvedContent) {
                        updatePrompt(prompt.id, { content: improvedContent });
                        setImprovingId(null);
                        setImprovedContent("");
                        toast.success("Prompt updated with improved version");
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Form Modal */}
      {showForm && (
        <PromptForm
          initial={editingPrompt}
          onSave={(data) => {
            if (editingPrompt) {
              updatePrompt(editingPrompt.id, data);
              toast.success("Prompt updated");
            } else {
              addPrompt({
                id: crypto.randomUUID(),
                ...data,
                isFavorite: false,
                useCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              toast.success("Prompt created");
            }
            setShowForm(false);
            setEditingPrompt(null);
          }}
          onClose={() => {
            setShowForm(false);
            setEditingPrompt(null);
          }}
        />
      )}
    </div>
  );
}

function PromptCard({
  prompt, isImproving, improvedContent,
  onUse, onEdit, onDuplicate, onFavorite, onDelete, onImprove, onSaveImproved,
}: {
  prompt: Prompt;
  isImproving: boolean;
  improvedContent: string;
  onUse: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onImprove: () => void;
  onSaveImproved: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4 bg-surface-2 border border-border-1 hover:border-border-2 rounded-xl transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-200 truncate">{prompt.title}</h3>
            {prompt.isFavorite && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />}
            <span className="text-xs text-zinc-600 shrink-0">{prompt.category}</span>
          </div>
          <p
            className={clsx(
              "text-xs text-zinc-500 mt-1.5 whitespace-pre-wrap",
              expanded ? "" : "line-clamp-2"
            )}
          >
            {prompt.content}
          </p>
          {prompt.content.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-zinc-600 hover:text-zinc-400 mt-1"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      </div>

      {/* Improved content preview */}
      {isImproving && (
        <div className="mt-3 p-3 bg-purple-950/30 border border-purple-800/30 rounded-lg">
          <p className="text-xs text-purple-300 mb-1.5 flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 animate-pulse" />
            {improvedContent ? "Improved version:" : "Improving..."}
          </p>
          {improvedContent && (
            <>
              <p className="text-xs text-zinc-300 whitespace-pre-wrap">{improvedContent}</p>
              <button
                onClick={onSaveImproved}
                className="mt-2 text-xs bg-purple-700/50 hover:bg-purple-600/50 text-purple-200 px-3 py-1 rounded-lg"
              >
                Use this version
              </button>
            </>
          )}
        </div>
      )}

      {/* Tags */}
      {prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {prompt.tags.map((tag) => (
            <span key={tag} className="text-xs bg-surface-3 text-zinc-600 px-1.5 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border-1">
        <button onClick={onUse} className="btn-primary text-xs py-1 px-3">
          {t("prompts.use")}
        </button>
        <button onClick={onImprove} disabled={isImproving} className="btn-secondary text-xs py-1 px-2">
          <Wand2 className={clsx("w-3 h-3", isImproving && "animate-spin")} />
          {t("prompts.improve")}
        </button>
        <button onClick={onEdit} className="btn-ghost py-1 px-2">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDuplicate} className="btn-ghost py-1 px-2">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button onClick={onFavorite} className="btn-ghost py-1 px-2">
          {prompt.isFavorite ? <StarOff className="w-3.5 h-3.5 text-yellow-400" /> : <Star className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onDelete} className="btn-ghost py-1 px-2 hover:text-red-400 ml-auto">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function PromptForm({
  initial, onSave, onClose,
}: {
  initial: Prompt | null;
  onSave: (data: Pick<Prompt, "title" | "content" | "category" | "tags">) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [category, setCategory] = useState<PromptCategory>(initial?.category || "general");
  const [tags, setTags] = useState(initial?.tags.join(", ") || "");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-2 border border-border-1 rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-1">
          <h2 className="text-sm font-semibold text-zinc-100">
            {initial ? t("prompts.edit") : t("prompts.new")}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">{t("prompts.name")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Enter prompt name..."
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">{t("prompts.content")}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="input-field resize-y min-h-32"
              placeholder="Enter prompt content... Use {{variable}} for variables"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">{t("prompts.category")}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PromptCategory)}
                className="input-field"
              >
                {CATEGORIES.filter((c) => c.value !== "all").map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">{t("prompts.tags")}</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="input-field"
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={() =>
              onSave({
                title,
                content,
                category,
                tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
              })
            }
            disabled={!title.trim() || !content.trim()}
            className="btn-primary flex-1 justify-center"
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
