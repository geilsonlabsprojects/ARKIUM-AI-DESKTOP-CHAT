import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Prompt, PromptCategory } from "../types";

interface PromptState {
  prompts: Prompt[];
  addPrompt: (prompt: Prompt) => void;
  updatePrompt: (id: string, partial: Partial<Prompt>) => void;
  deletePrompt: (id: string) => void;
  duplicatePrompt: (id: string) => void;
  toggleFavorite: (id: string) => void;
  incrementUseCount: (id: string) => void;
  searchPrompts: (query: string, category?: PromptCategory) => Prompt[];
}

const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: "default-1",
    title: "Code Reviewer",
    content: "Review the following code and provide detailed feedback on:\n1. Code quality and readability\n2. Potential bugs or issues\n3. Performance improvements\n4. Security considerations\n5. Best practices\n\nCode:\n{{code}}",
    category: "coding",
    tags: ["code", "review", "quality"],
    isFavorite: true,
    useCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "default-2",
    title: "Project Analyzer",
    content: "Analyze this project and provide:\n1. Overall structure and architecture\n2. Technologies and dependencies\n3. Code quality assessment\n4. Potential improvements\n5. Security concerns\n\nProject files:\n{{files}}",
    category: "analysis",
    tags: ["project", "analysis", "architecture"],
    isFavorite: true,
    useCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "default-3",
    title: "Bug Fixer",
    content: "I have a bug in my code. Please help me fix it.\n\nError message:\n{{error}}\n\nCode:\n{{code}}\n\nPlease provide:\n1. The cause of the bug\n2. The fix\n3. Explanation of the solution",
    category: "coding",
    tags: ["bug", "fix", "debugging"],
    isFavorite: false,
    useCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "default-4",
    title: "Technical Writer",
    content: "Write clear, professional technical documentation for:\n\n{{content}}\n\nInclude:\n1. Overview\n2. Installation/Setup\n3. Usage examples\n4. API reference (if applicable)\n5. Troubleshooting",
    category: "writing",
    tags: ["documentation", "technical", "writing"],
    isFavorite: false,
    useCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "default-5",
    title: "Create React Component",
    content: "Create a React TypeScript component with the following requirements:\n\n{{requirements}}\n\nThe component should:\n- Use TypeScript with proper types\n- Follow React best practices\n- Include proper error handling\n- Be accessible (ARIA attributes)\n- Use Tailwind CSS for styling",
    category: "coding",
    tags: ["react", "typescript", "component"],
    isFavorite: true,
    useCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const usePromptStore = create<PromptState>()(
  persist(
    (set, get) => ({
      prompts: DEFAULT_PROMPTS,

      addPrompt: (prompt) =>
        set((s) => ({ prompts: [prompt, ...s.prompts] })),

      updatePrompt: (id, partial) =>
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id
              ? { ...p, ...partial, updatedAt: new Date().toISOString() }
              : p
          ),
        })),

      deletePrompt: (id) =>
        set((s) => ({ prompts: s.prompts.filter((p) => p.id !== id) })),

      duplicatePrompt: (id) => {
        const prompt = get().prompts.find((p) => p.id === id);
        if (prompt) {
          const duplicate: Prompt = {
            ...prompt,
            id: crypto.randomUUID(),
            title: `${prompt.title} (copy)`,
            isFavorite: false,
            useCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set((s) => ({ prompts: [duplicate, ...s.prompts] }));
        }
      },

      toggleFavorite: (id) =>
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
          ),
        })),

      incrementUseCount: (id) =>
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id ? { ...p, useCount: p.useCount + 1 } : p
          ),
        })),

      searchPrompts: (query, category) => {
        const prompts = get().prompts;
        const q = query.toLowerCase();
        return prompts.filter((p) => {
          const matchesQuery =
            !q ||
            p.title.toLowerCase().includes(q) ||
            p.content.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q));
          const matchesCategory = !category || p.category === category;
          return matchesQuery && matchesCategory;
        });
      },
    }),
    { name: "arkium-prompts" }
  )
);
