import { useMemoryStore } from "../stores/memoryStore";
import type { MemoryType } from "../types";

export function saveMemory(
  type: MemoryType,
  key: string,
  value: string,
  options?: {
    conversationId?: string;
    projectId?: string;
    importance?: number;
  }
): void {
  const store = useMemoryStore.getState();
  if (!store.enabled) return;

  // Update if exists, otherwise add
  const existing = store.memories.find(
    (m) => m.type === type && m.key === key
  );

  if (existing) {
    store.updateMemory(existing.id, { value, ...options });
  } else {
    store.addMemory({
      type,
      key,
      value,
      conversationId: options?.conversationId,
      projectId: options?.projectId,
      importance: options?.importance ?? 5,
    });
  }
}

export function getMemoryContext(conversationId?: string): string {
  const store = useMemoryStore.getState();
  if (!store.enabled || !store.memories.length) return "";

  const relevant = store.memories
    .filter((m) => {
      if (m.type === "preference") return true;
      if (conversationId && m.conversationId === conversationId) return true;
      if (m.type === "fact" && m.importance >= 7) return true;
      return false;
    })
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10);

  if (!relevant.length) return "";

  const memoryText = relevant
    .map((m) => `- ${m.key}: ${m.value}`)
    .join("\n");

  return `\n\n[Memory Context]\n${memoryText}`;
}

export function extractMemoriesFromConversation(
  userMessage: string,
  assistantResponse: string,
  conversationId: string
): void {
  const store = useMemoryStore.getState();
  if (!store.enabled) return;

  // Simple heuristics to extract facts/preferences
  const patterns = [
    { regex: /my name is (\w+)/i, key: "user_name", type: "fact" as MemoryType },
    { regex: /i (?:am|work as) (?:a |an )?(.+?)(?:\.|,|$)/i, key: "user_role", type: "fact" as MemoryType },
    { regex: /i prefer (.+?)(?:\.|,|$)/i, key: "preference", type: "preference" as MemoryType },
    { regex: /i (?:always|usually|often) (.+?)(?:\.|,|$)/i, key: "habit", type: "preference" as MemoryType },
    { regex: /my (?:project|app|application) is (.+?)(?:\.|,|$)/i, key: "current_project", type: "project" as MemoryType },
  ];

  const text = `${userMessage} ${assistantResponse}`;
  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match?.[1]) {
      saveMemory(pattern.type, pattern.key, match[1].trim(), {
        conversationId,
        importance: 6,
      });
    }
  }
}
