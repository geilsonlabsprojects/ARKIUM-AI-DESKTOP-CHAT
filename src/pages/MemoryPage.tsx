import { useState } from "react";
import { Brain, Trash2, Edit2, Plus, Search, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMemoryStore } from "../stores/memoryStore";
import type { Memory, MemoryType } from "../types";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

const MEMORY_TYPES: { value: MemoryType | "all"; label: string; color: string }[] = [
  { value: "all", label: "All", color: "text-zinc-400" },
  { value: "conversation", label: "Conversation", color: "text-blue-400" },
  { value: "project", label: "Project", color: "text-yellow-400" },
  { value: "preference", label: "Preference", color: "text-green-400" },
  { value: "fact", label: "Fact", color: "text-purple-400" },
];

export default function MemoryPage() {
  const { t } = useTranslation();
  const { memories, enabled, setEnabled, deleteMemory, addMemory, updateMemory, clearAll } = useMemoryStore();

  const [filter, setFilter] = useState<MemoryType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = memories.filter((m) => {
    if (filter !== "all" && m.type !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-1">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">{t("nav.memory")}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Local memory — stored only on your device</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Enable/disable toggle */}
          <button
            onClick={() => setEnabled(!enabled)}
            className="flex items-center gap-2 text-sm"
          >
            {enabled ? (
              <ToggleRight className="w-6 h-6 text-green-400" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-zinc-500" />
            )}
            <span className={enabled ? "text-zinc-200" : "text-zinc-500"}>
              {enabled ? "Memory enabled" : "Memory disabled"}
            </span>
          </button>
        </div>
      </div>

      {!enabled && (
        <div className="mx-6 mt-4 p-3 bg-yellow-950/30 border border-yellow-800/40 rounded-xl text-xs text-yellow-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Memory is disabled. ARKIUM will not remember anything from conversations.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="input-field pl-9 py-1.5 text-xs"
          />
        </div>

        <div className="flex gap-1">
          {MEMORY_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={clsx(
                "px-2.5 py-1 text-xs rounded-lg transition-colors",
                filter === value
                  ? "bg-surface-3 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-secondary text-xs py-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
          {memories.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Clear all memories?")) {
                  clearAll();
                  toast.success("All memories cleared");
                }
              }}
              className="btn-danger text-xs py-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              {memories.length === 0
                ? "No memories yet. Memories are auto-extracted from conversations."
                : "No memories match your search."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((memory) => (
              <MemoryRow
                key={memory.id}
                memory={memory}
                onDelete={() => {
                  deleteMemory(memory.id);
                  toast.success("Memory deleted");
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddMemoryForm
          onSave={(data) => {
            addMemory(data);
            setShowAddForm(false);
            toast.success("Memory added");
          }}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

function MemoryRow({ memory, onDelete }: { memory: Memory; onDelete: () => void }) {
  const typeColors: Record<MemoryType, string> = {
    conversation: "text-blue-400 bg-blue-950/30 border-blue-800/40",
    project: "text-yellow-400 bg-yellow-950/30 border-yellow-800/40",
    preference: "text-green-400 bg-green-950/30 border-green-800/40",
    fact: "text-purple-400 bg-purple-950/30 border-purple-800/40",
  };

  return (
    <div className="group flex items-start gap-3 p-3 bg-surface-2 border border-border-1 rounded-xl hover:border-border-2 transition-colors">
      <div className={clsx(
        "shrink-0 text-xs px-2 py-0.5 rounded-full border",
        typeColors[memory.type]
      )}>
        {memory.type}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-300 truncate">{memory.key}</p>
        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{memory.value}</p>
        <p className="text-xs text-zinc-700 mt-1">
          {formatDistanceToNow(new Date(memory.updatedAt), { addSuffix: true })}
          {" • "}Importance: {memory.importance}/10
        </p>
      </div>
      <button
        onClick={onDelete}
        className="hidden group-hover:block p-1 text-zinc-600 hover:text-red-400 rounded transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function AddMemoryForm({
  onSave, onClose,
}: {
  onSave: (data: Pick<Memory, "type" | "key" | "value" | "importance">) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<MemoryType>("fact");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [importance, setImportance] = useState(5);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-2 border border-border-1 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-1">
          <h2 className="text-sm font-semibold text-zinc-100">Add Memory</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as MemoryType)} className="input-field">
              <option value="fact">Fact</option>
              <option value="preference">Preference</option>
              <option value="conversation">Conversation</option>
              <option value="project">Project</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Key</label>
            <input value={key} onChange={(e) => setKey(e.target.value)} className="input-field" placeholder="e.g. user_name" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Value</label>
            <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} className="input-field" placeholder="Memory content..." />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Importance: {importance}/10</label>
            <input type="range" min="1" max="10" value={importance} onChange={(e) => setImportance(parseInt(e.target.value))} className="w-full accent-arkium-500" />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={() => key && value && onSave({ type, key, value, importance })}
            disabled={!key || !value}
            className="btn-primary flex-1 justify-center"
          >
            Add Memory
          </button>
        </div>
      </div>
    </div>
  );
}
