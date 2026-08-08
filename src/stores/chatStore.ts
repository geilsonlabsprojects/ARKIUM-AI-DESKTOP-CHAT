import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Conversation, Message } from "../types";

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;

  // CRUD conversations
  addConversation: (conv: Conversation) => void;
  updateConversation: (id: string, partial: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  pinConversation: (id: string, pinned: boolean) => void;

  // Messages
  getMessages: (conversationId: string) => Message[];
  addMessage: (msg: Message) => void;
  updateMessage: (conversationId: string, msgId: string, partial: Partial<Message>) => void;
  deleteMessage: (conversationId: string, msgId: string) => void;
  clearMessages: (conversationId: string) => void;

  // Streaming
  streamingMessageId: string | null;
  setStreamingMessageId: (id: string | null) => void;
  appendStreamChunk: (conversationId: string, msgId: string, chunk: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: {},

      addConversation: (conv) =>
        set((s) => ({
          conversations: [conv, ...s.conversations],
          messages: { ...s.messages, [conv.id]: [] },
        })),

      updateConversation: (id, partial) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, ...partial, updatedAt: new Date().toISOString() } : c
          ),
        })),

      deleteConversation: (id) =>
        set((s) => {
          const { [id]: _msgs, ...restMessages } = s.messages;
          return {
            conversations: s.conversations.filter((c) => c.id !== id),
            messages: restMessages,
          };
        }),

      pinConversation: (id, pinned) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, isPinned: pinned } : c
          ),
        })),

      getMessages: (conversationId) => {
        return get().messages[conversationId] || [];
      },

      addMessage: (msg) =>
        set((s) => {
          const existing = s.messages[msg.conversationId] || [];
          return {
            messages: {
              ...s.messages,
              [msg.conversationId]: [...existing, msg],
            },
          };
        }),

      updateMessage: (conversationId, msgId, partial) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [conversationId]: (s.messages[conversationId] || []).map((m) =>
              m.id === msgId ? { ...m, ...partial } : m
            ),
          },
        })),

      deleteMessage: (conversationId, msgId) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [conversationId]: (s.messages[conversationId] || []).filter(
              (m) => m.id !== msgId
            ),
          },
        })),

      clearMessages: (conversationId) =>
        set((s) => ({
          messages: { ...s.messages, [conversationId]: [] },
        })),

      streamingMessageId: null,
      setStreamingMessageId: (id) => set({ streamingMessageId: id }),

      appendStreamChunk: (conversationId, msgId, chunk) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [conversationId]: (s.messages[conversationId] || []).map((m) =>
              m.id === msgId ? { ...m, content: m.content + chunk } : m
            ),
          },
        })),
    }),
    {
      name: "arkium-chat",
      partialize: (s) => ({
        conversations: s.conversations.slice(0, 200), // Keep last 200 conversations
        messages: Object.fromEntries(
          Object.entries(s.messages)
            .slice(0, 200)
            .map(([k, msgs]) => [k, msgs.slice(-100)]) // Keep last 100 msgs per conversation
        ),
      }),
    }
  )
);
