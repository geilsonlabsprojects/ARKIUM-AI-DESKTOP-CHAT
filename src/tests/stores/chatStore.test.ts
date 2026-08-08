import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "../../stores/chatStore";
import type { Conversation, Message } from "../../types";

// Reset store before each test
beforeEach(() => {
  useChatStore.setState({ conversations: [], messages: {}, streamingMessageId: null });
});

function makeConversation(overrides?: Partial<Conversation>): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "Test Chat",
    model: "llama3.2",
    isPinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeMessage(conversationId: string, overrides?: Partial<Message>): Message {
  return {
    id: crypto.randomUUID(),
    conversationId,
    role: "user",
    content: "Hello",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("chatStore", () => {
  describe("conversations", () => {
    it("adds a conversation", () => {
      const conv = makeConversation();
      useChatStore.getState().addConversation(conv);
      expect(useChatStore.getState().conversations).toHaveLength(1);
      expect(useChatStore.getState().conversations[0].id).toBe(conv.id);
    });

    it("updates a conversation title", () => {
      const conv = makeConversation({ title: "Original" });
      useChatStore.getState().addConversation(conv);
      useChatStore.getState().updateConversation(conv.id, { title: "Updated" });
      const updated = useChatStore.getState().conversations.find((c) => c.id === conv.id);
      expect(updated?.title).toBe("Updated");
    });

    it("deletes a conversation and its messages", () => {
      const conv = makeConversation();
      const msg = makeMessage(conv.id);
      useChatStore.getState().addConversation(conv);
      useChatStore.getState().addMessage(msg);
      useChatStore.getState().deleteConversation(conv.id);
      expect(useChatStore.getState().conversations).toHaveLength(0);
      expect(useChatStore.getState().messages[conv.id]).toBeUndefined();
    });

    it("pins and unpins a conversation", () => {
      const conv = makeConversation({ isPinned: false });
      useChatStore.getState().addConversation(conv);
      useChatStore.getState().pinConversation(conv.id, true);
      expect(useChatStore.getState().conversations[0].isPinned).toBe(true);
      useChatStore.getState().pinConversation(conv.id, false);
      expect(useChatStore.getState().conversations[0].isPinned).toBe(false);
    });
  });

  describe("messages", () => {
    it("adds a message", () => {
      const conv = makeConversation();
      useChatStore.getState().addConversation(conv);
      const msg = makeMessage(conv.id, { content: "Hi there" });
      useChatStore.getState().addMessage(msg);
      const messages = useChatStore.getState().getMessages(conv.id);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Hi there");
    });

    it("updates a message", () => {
      const conv = makeConversation();
      useChatStore.getState().addConversation(conv);
      const msg = makeMessage(conv.id, { content: "Original" });
      useChatStore.getState().addMessage(msg);
      useChatStore.getState().updateMessage(conv.id, msg.id, { content: "Updated" });
      const messages = useChatStore.getState().getMessages(conv.id);
      expect(messages[0].content).toBe("Updated");
    });

    it("deletes a message", () => {
      const conv = makeConversation();
      useChatStore.getState().addConversation(conv);
      const msg = makeMessage(conv.id);
      useChatStore.getState().addMessage(msg);
      useChatStore.getState().deleteMessage(conv.id, msg.id);
      expect(useChatStore.getState().getMessages(conv.id)).toHaveLength(0);
    });

    it("clears all messages in a conversation", () => {
      const conv = makeConversation();
      useChatStore.getState().addConversation(conv);
      useChatStore.getState().addMessage(makeMessage(conv.id));
      useChatStore.getState().addMessage(makeMessage(conv.id));
      useChatStore.getState().clearMessages(conv.id);
      expect(useChatStore.getState().getMessages(conv.id)).toHaveLength(0);
    });

    it("appends stream chunks", () => {
      const conv = makeConversation();
      useChatStore.getState().addConversation(conv);
      const msg = makeMessage(conv.id, { role: "assistant", content: "" });
      useChatStore.getState().addMessage(msg);
      useChatStore.getState().appendStreamChunk(conv.id, msg.id, "Hello");
      useChatStore.getState().appendStreamChunk(conv.id, msg.id, " world");
      const messages = useChatStore.getState().getMessages(conv.id);
      expect(messages[0].content).toBe("Hello world");
    });

    it("returns empty array for unknown conversation", () => {
      expect(useChatStore.getState().getMessages("non-existent")).toEqual([]);
    });
  });

  describe("streaming", () => {
    it("sets and clears streaming message ID", () => {
      useChatStore.getState().setStreamingMessageId("msg-123");
      expect(useChatStore.getState().streamingMessageId).toBe("msg-123");
      useChatStore.getState().setStreamingMessageId(null);
      expect(useChatStore.getState().streamingMessageId).toBeNull();
    });
  });
});
