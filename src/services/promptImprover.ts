import { chatStream } from "./ollama";
import { useSettingsStore } from "../stores/settingsStore";

const IMPROVE_SYSTEM = `You are an expert prompt engineer. Your job is to take a simple, vague prompt and transform it into a detailed, professional, and effective prompt.

Rules:
- Make the prompt specific and detailed
- Add context and constraints
- Specify the desired output format when appropriate
- Add relevant examples if helpful
- Keep the original intent
- Make it clear and unambiguous
- Use best practices for the AI model

Return ONLY the improved prompt, nothing else.`;

export async function improvePrompt(
  originalPrompt: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (e: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const model = useSettingsStore.getState().ai.defaultModel;
  if (!model) {
    onError("No model selected. Please select an Ollama model first.");
    return;
  }

  await chatStream(
    model,
    [
      {
        role: "user",
        content: `Improve this prompt:\n\n"${originalPrompt}"`,
      },
    ],
    { temperature: 0.7, numCtx: 2048 },
    IMPROVE_SYSTEM,
    { onChunk, onDone: () => onDone(), onError, signal }
  );
}
