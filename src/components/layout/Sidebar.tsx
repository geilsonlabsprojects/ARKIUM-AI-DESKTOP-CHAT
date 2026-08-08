import { NavLink, useNavigate } from "react-router-dom";
import {
  MessageSquare, Cpu, FolderOpen, Briefcase, BookText,
  Search, Brain, ScrollText, Settings, Plus, ChevronLeft,
  ChevronRight, Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../stores/appStore";
import { useChatStore } from "../../stores/chatStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { clsx } from "clsx";
import ConversationList from "../chat/ConversationList";

const navItems = [
  { to: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
  { to: "/models", icon: Cpu, labelKey: "nav.models" },
  { to: "/files", icon: FolderOpen, labelKey: "nav.files" },
  { to: "/projects", icon: Briefcase, labelKey: "nav.projects" },
  { to: "/prompts", icon: BookText, labelKey: "nav.prompts" },
  { to: "/search", icon: Search, labelKey: "nav.search" },
  { to: "/memory", icon: Brain, labelKey: "nav.memory" },
  { to: "/logs", icon: ScrollText, labelKey: "nav.logs" },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const { sidebarCollapsed, toggleSidebar, ollamaStatus } = useAppStore();
  const { conversations, addConversation, setActiveConversationId } = useChatStore();
  const { ai: aiSettings } = useSettingsStore();
  const navigate = useNavigate();

  function handleNewChat() {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    addConversation({
      id,
      title: "New Chat",
      model: aiSettings.defaultModel,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    });
    setActiveConversationId(id);
    navigate(`/chat/${id}`);
  }

  return (
    <aside
      className={clsx(
        "flex flex-col bg-surface-1 border-r border-border-1 transition-all duration-200 shrink-0",
        sidebarCollapsed ? "w-14" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-border-1">
        <div className="w-8 h-8 rounded-lg bg-arkium-600 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-100 leading-none">ARKIUM</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">AI Desktop Chat</p>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="ml-auto p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-2 py-2 border-b border-border-1">
        <button
          onClick={handleNewChat}
          className={clsx(
            "flex items-center gap-2 w-full px-2 py-2 text-sm font-medium text-zinc-200",
            "bg-arkium-600/20 hover:bg-arkium-600/30 border border-arkium-700/30 hover:border-arkium-600/50",
            "rounded-lg transition-colors",
            sidebarCollapsed ? "justify-center" : ""
          )}
          title={t("chat.new")}
        >
          <Plus className="w-4 h-4 text-arkium-400 shrink-0" />
          {!sidebarCollapsed && <span>{t("chat.new")}</span>}
        </button>
      </div>

      {/* Conversations (only when expanded and on chat route) */}
      {!sidebarCollapsed && (
        <div className="flex-1 overflow-y-auto py-1">
          <ConversationList />
        </div>
      )}

      {/* Nav Items */}
      <nav className="px-2 py-2 border-t border-border-1 space-y-0.5">
        {navItems.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-surface-3 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-surface-2",
                sidebarCollapsed ? "justify-center" : ""
              )
            }
            title={sidebarCollapsed ? t(labelKey) : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>{t(labelKey)}</span>}
          </NavLink>
        ))}

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors",
              isActive
                ? "bg-surface-3 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-surface-2",
              sidebarCollapsed ? "justify-center" : ""
            )
          }
          title={sidebarCollapsed ? t("nav.settings") : undefined}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && <span>{t("nav.settings")}</span>}
        </NavLink>
      </nav>

      {/* Ollama status indicator */}
      {!sidebarCollapsed && (
        <div className="px-3 py-2 border-t border-border-1">
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                "w-2 h-2 rounded-full",
                ollamaStatus?.apiAvailable ? "bg-green-500" : "bg-red-500 animate-pulse"
              )}
            />
            <span className="text-xs text-zinc-500">
              {ollamaStatus?.apiAvailable
                ? t("status.ollama_connected")
                : t("status.ollama_disconnected")}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
