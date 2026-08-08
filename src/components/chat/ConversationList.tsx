import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pin, Trash2, Edit2, MoreHorizontal, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useChatStore } from "../../stores/chatStore";
import { useAppStore } from "../../stores/appStore";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

export default function ConversationList() {
  const { t } = useTranslation();
  const { id: activeId } = useParams();
  const navigate = useNavigate();
  const { conversations, deleteConversation, updateConversation, pinConversation } = useChatStore();
  const { setActiveConversationId } = useAppStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const sorted = [...conversations]
    .filter((c) => {
      if (!searchQuery) return true;
      return c.title.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  function handleSelect(id: string) {
    setActiveConversationId(id);
    navigate(`/chat/${id}`);
  }

  function startEdit(conv: { id: string; title: string }, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  }

  function saveEdit(id: string) {
    if (editTitle.trim()) {
      updateConversation(id, { title: editTitle.trim() });
    }
    setEditingId(null);
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteConversation(id);
    if (activeId === id) navigate("/chat");
    toast.success("Conversation deleted");
  }

  if (conversations.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <MessageSquare className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
        <p className="text-xs text-zinc-600">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 px-2">
      {/* Search conversations */}
      {conversations.length > 5 && (
        <div className="px-1 mb-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full px-2 py-1 text-xs bg-surface-3 border border-border-1 rounded text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-arkium-500"
          />
        </div>
      )}

      {sorted.map((conv) => (
        <div
          key={conv.id}
          onClick={() => handleSelect(conv.id)}
          className={clsx(
            "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors",
            activeId === conv.id
              ? "bg-surface-3 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-surface-2"
          )}
        >
          {conv.isPinned && (
            <Pin className="w-3 h-3 text-arkium-400 shrink-0" />
          )}

          {editingId === conv.id ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => saveEdit(conv.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit(conv.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-surface-4 border border-arkium-500 rounded px-1 py-0.5 text-xs text-zinc-200 focus:outline-none"
            />
          ) : (
            <span className="flex-1 text-xs truncate">
              {conv.title || "New Chat"}
            </span>
          )}

          {/* Actions */}
          <div className="hidden group-hover:flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => startEdit(conv, e)}
              className="p-0.5 text-zinc-500 hover:text-zinc-300 rounded"
              title="Rename"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                pinConversation(conv.id, !conv.isPinned);
              }}
              className="p-0.5 text-zinc-500 hover:text-zinc-300 rounded"
              title={conv.isPinned ? "Unpin" : "Pin"}
            >
              <Pin className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleDelete(conv.id, e)}
              className="p-0.5 text-zinc-500 hover:text-red-400 rounded"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
