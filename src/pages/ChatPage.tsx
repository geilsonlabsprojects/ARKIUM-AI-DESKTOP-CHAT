import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MessageSquare, Plus } from "lucide-react";
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
    conversations, messages, addConversation, updateConversation,
    addMessage, updateMessage, deleteMessage, getMessages, setStreamingMessageId,
    appendStreamChunk,
  } = useChatStore();

  const { ai: aiSettings, security } = useSettingsStore();
  const { setActiveConversationId } = useAppStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find((c) => c.id === convId);
  const convMessages = convId ? getMessages(convId) : [];

  useEffect(() => {
    if (convId) setActiveConversationId(convId);
  }, [convId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convMessages]);

  // Auto-create conversation if none
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

      // Build user message content
      let userContent = text;
      if (attachments.length > 0) {
        const attachmentTexts = attachments.map(
          (att) => `\n\n[File: ${att.name}]\n${att.content || "(binary file)"}`
        );
        userContent = text + attachmentTexts.join("");
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

      // Auto-generate title on first message
      if (convMessages.length === 0) {
        const title = text.slice(0, 60).trim() || "New Chat";
        updateConversation(convId, { title });
      }

      // Prepare assistant message placeholder
      const assistantMsgId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantMsgId,
        conversationId: convId,
        role: "assistant",
        content: "",
        model: aiSettings.defaultModel,
        isStreaming: true,
        createdAt: new Date().toISOString(),
      };
      addMessage(assistantMsg);
      setStreamingMessageId(assistantMsgId);

      const startTime = Date.now();

      try {
        if (useAgent) {
          // Agent mode
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
              onStep: (step) => setAgentSteps((prev) => {
                const idx = prev.findIndex((s) => s.id === step.id);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = step;
                  return updated;
                }
                return [...prev, step];
              }),
              onChunk: (chunk) => appendStreamChunk(convId, assistantMsgId, chunk),
              onDone: (finalResponse) => {
                const duration = Date.now() - startTime;
                updateMessage(convId, assistantMsgId, {
                  isStreaming: false,
                  durationMs: duration,
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
          // Regular chat mode (with optional web search)
          let contextAddition = "";
          let sources: SearchSource[] = [];

          if (useSearch || shouldSearchWeb(text)) {
            try {
              updateMessage(convId, assistantMsgId, {
                content: t("chat.searching"),
              });
              const searchResult = await searchWeb(text);
              sources = searchResult.results;
              contextAddition = formatSourcesForContext(searchResult.results);
            } catch (e) {
              console.error("Search failed:", e);
            }
          }

          // Add memory context
          const memoryCtx = getMemoryContext(convId);
          const systemPrompt = aiSettings.systemPrompt + memoryCtx;

          // Build message history
          const history = convMessages.slice(-20).map((m) => ({
            role: m.role === "tool" ? "user" : m.role,
            content: m.content,
          }));

          const promptWithContext = userContent + contextAddition;

          // Reset content before streaming
          updateMessage(convId, assistantMsgId, { content: "" });

          await chatStream(
            aiSettings.defaultModel,
            [...history, { role: "user", content: promptWithContext }],
            {
              temperature: aiSettings.temperature,
              topP: aiSettings.topP,
              numCtx: aiSettings.numCtx,
            },
            systemPrompt,
            {
              onChunk: (chunk) => appendStreamChunk(convId, assistantMsgId, chunk),
              onDone: ({ evalCount }) => {
                const duration = Date.now() - startTime;
                updateMessage(convId, assistantMsgId, {
                  isStreaming: false,
                  durationMs: duration,
                  tokensUsed: evalCount,
                  sources: sources.length > 0 ? sources : undefined,
                });

                // Extract memories
                const finalContent = getMessages(convId).find((m) => m.id === assistantMsgId)?.content || "";
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
          content: `Unexpected error: ${e}`,
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
    const lastUserMsg = [...convMessages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    // Remove last assistant message
    const lastAssistant = [...convMessages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant) deleteMessage(convId, lastAssistant.id);
    await handleSend(lastUserMsg.content, lastUserMsg.attachments || [], false, false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {convMessages.length === 0 ? (
          <EmptyState t={t} onSend={handleSend} />
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
            {/* Agent steps */}
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

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isGenerating={isGenerating}
        disabled={!aiSettings.defaultModel}
      />
    </div>
  );
}

function EmptyState({
  t,
  onSend,
}: {
  t: (key: string) => string;
  onSend: (text: string, attachments: [], useSearch: boolean, useAgent: boolean) => void;
}) {
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
            className="text-left px-4 py-2.5 bg-surface-2 hover:bg-surface-3 border border-border-1 hover:border-border-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
