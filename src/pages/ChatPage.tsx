import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import ChatInput from "../components/chat/ChatInput";
import MessageBubble from "../components/chat/MessageBubble";
import AgentStepsPanel from "../components/chat/AgentStepsPanel";
import { useChatStore } from "../stores/chatStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useAppStore } from "../stores/appStore";
import { chatStream } from "../services/ollama";
import { searchWeb, formatSourcesForContext, shouldSearchWeb } from "../services/websearch";
import { runAgent } from "../services/agent";
import { getMemoryContext, extractMemoriesFromConversation } from "../services/memory";
import type { Message, Attachment, AgentStep, AgentStatus, SearchSource } from "../types";
import toast from "react-hot-toast";

export default function ChatPage() {
  const { t } = useTranslation();
  const { id: convId } = useParams();
  const navigate = useNavigate();

  const {
    conversations,
    addConversation,
    updateConversation,
    addMessage,
    updateMessage,
    deleteMessage,
    getMessages,
    setStreamingMessageId,
    appendStreamChunk,
  } = useChatStore();

  const { ai: aiSettings } = useSettingsStore();
  const { setActiveConversationId } = useAppStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const convMessages = convId ? getMessages(convId) : [];

  useEffect(() => {
    if (convId) setActiveConversationId(convId);
  }, [convId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convMessages]);

  // Auto-create conversation if none selected
  useEffect(() => {
    if (!convId) {
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
      navigate(`/chat/${id}`, { replace: true });
    }
  }, [convId]);

  const handleSend = useCallback(
    async (
      text: string,
      attachments: Attachment[],
      useSearch: boolean,
      useAgent: boolean
    ) => {
      if (!convId || !aiSettings.defaultModel) {
        if (!aiSettings.defaultModel) {
          toast.error("Please select a model first. Go to Models page.");
        }
        return;
      }
      if (isGenerating) return;

      const abortController = new AbortController();
      abortRef.current = abortController;
      setIsGenerating(true);
      setAgentSteps([]);

      // Build user content (include attached file contents)
      let userContent = text;
      if (attachments.length > 0) {
        const parts = attachments.map(
          (att) => `\n\n[File: ${att.name}]\n${att.content ?? "(binary file)"}`
        );
        userContent = text + parts.join("");
      }

      // Add user message
      const userMsg: Message = {
        id: crypto.randomUUID(),
        conversationId: convId,
        role: "user",
        content: userContent,
        createdAt: new Date().toISOString(),
        attachments,
      };
      addMessage(userMsg);

      // Auto-title on first message
      if (convMessages.length === 0) {
        updateConversation(convId, { title: text.slice(0, 60).trim() || "New Chat" });
      }

      // Placeholder assistant message
      const assistantMsgId = crypto.randomUUID();
      addMessage({
        id: assistantMsgId,
        conversationId: convId,
        role: "assistant",
        content: "",
        model: aiSettings.defaultModel,
        isStreaming: true,
        createdAt: new Date().toISOString(),
      });
      setStreamingMessageId(assistantMsgId);

      const startTime = Date.now();

      try {
        if (useAgent) {
          setAgentStatus("planning");
          const history = convMessages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          }));

          await runAgent(
            userContent,
            history,
            { model: aiSettings.defaultModel, maxSteps: 10 },
            {
              onStep: (step) =>
                setAgentSteps((prev) => {
                  const idx = prev.findIndex((s) => s.id === step.id);
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = step;
                    return next;
                  }
                  return [...prev, step];
                }),
              onChunk: (chunk) => appendStreamChunk(convId, assistantMsgId, chunk),
              onDone: () => {
                updateMessage(convId, assistantMsgId, {
                  isStreaming: false,
                  durationMs: Date.now() - startTime,
                });
              },
              onError: (err) => {
                updateMessage(convId, assistantMsgId, {
                  content: `Error: ${err}`,
                  isStreaming: false,
                  isError: true,
                });
              },
              onStatusChange: setAgentStatus,
            },
            abortController.signal
          );
        } else {
          // Regular chat with optional web search
          let contextAddition = "";
          let sources: SearchSource[] = [];

          if (useSearch || shouldSearchWeb(text)) {
            try {
              updateMessage(convId, assistantMsgId, { content: t("chat.searching") });
              const searchResult = await searchWeb(text);
              sources = searchResult.results;
              contextAddition = formatSourcesForContext(searchResult.results);
            } catch {
              // Search failed — proceed without context
            }
          }

          const memoryCtx = getMemoryContext(convId);
          const systemPrompt = aiSettings.systemPrompt + memoryCtx;

          const history = convMessages.slice(-20).map((m) => ({
            role: m.role === "tool" ? "user" : m.role,
            content: m.content,
          }));

          // Clear placeholder before streaming
          updateMessage(convId, assistantMsgId, { content: "" });

          await chatStream(
            aiSettings.defaultModel,
            [...history, { role: "user", content: userContent + contextAddition }],
            {
              temperature: aiSettings.temperature,
              topP: aiSettings.topP,
              numCtx: aiSettings.numCtx,
            },
            systemPrompt,
            {
              onChunk: (chunk) => appendStreamChunk(convId, assistantMsgId, chunk),
              onDone: ({ evalCount }) => {
                updateMessage(convId, assistantMsgId, {
                  isStreaming: false,
                  durationMs: Date.now() - startTime,
                  tokensUsed: evalCount,
                  sources: sources.length > 0 ? sources : undefined,
                });
                const finalContent =
                  getMessages(convId).find((m) => m.id === assistantMsgId)?.content ?? "";
                extractMemoriesFromConversation(userContent, finalContent, convId);
              },
              onError: (err) => {
                updateMessage(convId, assistantMsgId, {
                  content: `Error: ${err}`,
                  isStreaming: false,
                  isError: true,
                });
              },
              signal: abortController.signal,
            }
          );
        }
      } catch (e) {
        updateMessage(convId, assistantMsgId, {
          content: `Unexpected error: ${String(e)}`,
          isStreaming: false,
          isError: true,
        });
      } finally {
        setIsGenerating(false);
        setStreamingMessageId(null);
        setAgentStatus("idle");
        updateConversation(convId, { updatedAt: new Date().toISOString() });
      }
    },
    [convId, convMessages, aiSettings, isGenerating]
  );

  const handleStop = () => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setStreamingMessageId(null);
    setAgentStatus("cancelled");
  };

  const handleRegenerate = async () => {
    if (!convId || convMessages.length < 1) return;
    const lastUser = [...convMessages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const lastAssistant = [...convMessages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant) deleteMessage(convId, lastAssistant.id);
    await handleSend(lastUser.content, lastUser.attachments ?? [], false, false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-4">
        {convMessages.length === 0 ? (
          <EmptyState onSend={handleSend} />
        ) : (
          <>
            {convMessages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isLast={idx === convMessages.length - 1}
                onRegenerate={
                  idx === convMessages.length - 1 && msg.role === "assistant"
                    ? handleRegenerate
                    : undefined
                }
                onDelete={() => deleteMessage(convId!, msg.id)}
                onEdit={(newContent) =>
                  updateMessage(convId!, msg.id, { content: newContent })
                }
              />
            ))}
            {agentSteps.length > 0 && (
              <AgentStepsPanel
                steps={agentSteps}
                status={agentStatus}
                onCancel={handleStop}
              />
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isGenerating={isGenerating}
        disabled={!aiSettings.defaultModel}
      />
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  onSend: (
    text: string,
    attachments: Attachment[],
    useSearch: boolean,
    useAgent: boolean
  ) => void;
}

function EmptyState({ onSend }: EmptyStateProps) {
  const { t } = useTranslation();

  const suggestions = [
    "What can you help me with?",
    "Analyze this code and suggest improvements",
    "Search the web for the latest AI models",
    "Create a React component for a login form",
    "Explain how RAG works in AI systems",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
      <div className="text-center">
        <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
        <h2 className="text-lg font-medium text-zinc-200">{t("chat.empty_title")}</h2>
        <p className="text-sm text-zinc-500 mt-1">{t("chat.empty_subtitle")}</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-lg">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSend(s, [], false, false)}
            className="text-left px-4 py-2.5 bg-surface-2 hover:bg-surface-3 border border-border-1
                       hover:border-border-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-200
                       transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
