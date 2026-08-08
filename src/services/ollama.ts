import { invoke } from "@tauri-apps/api/core";
import type {
  OllamaModel,
  OllamaStatus,
  Message,
  ChatOptions,
} from "../types";
import { useSettingsStore } from "../stores/settingsStore";
import { useAppStore } from "../stores/appStore";

function getApiUrl(): string {
  return useSettingsStore.getState().ollama.apiUrl || "http://localhost:11434";
}

export async function checkOllamaStatus(): Promise<OllamaStatus> {
  try {
    const result = await invoke<OllamaStatus>("check_ollama_status", {
      apiUrl: getApiUrl(),
    });
    const status = {
      installed: result.installed,
      running: result.running,
      apiAvailable: result.api_available ?? result.apiAvailable,
      apiUrl: result.api_url ?? result.apiUrl,
      version: result.version,
      modelsCount: result.models_count ?? result.modelsCount ?? 0,
      error: result.error,
    };
    useAppStore.getState().setOllamaStatus(status);
    return status;
  } catch (e) {
    const status: OllamaStatus = {
      installed: false,
      running: false,
      apiAvailable: false,
      apiUrl: getApiUrl(),
      modelsCount: 0,
      error: String(e),
    };
    useAppStore.getState().setOllamaStatus(status);
    return status;
  }
}

export async function listModels(): Promise<OllamaModel[]> {
  try {
    const models = await invoke<OllamaModel[]>("list_ollama_models", {
      apiUrl: getApiUrl(),
    });
    return models.map((m) => ({
      name: m.name,
      modifiedAt: (m as unknown as Record<string, string>).modified_at ?? m.modifiedAt ?? "",
      size: m.size,
      digest: m.digest,
      details: m.details,
    }));
  } catch (e) {
    console.error("Failed to list models:", e);
    return [];
  }
}

export async function pullModel(
  modelName: string,
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.("Starting download...");
  const result = await invoke<string>("pull_ollama_model", {
    modelName,
    apiUrl: getApiUrl(),
  });
  onProgress?.(result);
}

export async function deleteModel(modelName: string): Promise<boolean> {
  return invoke<boolean>("delete_ollama_model", {
    modelName,
    apiUrl: getApiUrl(),
  });
}

export async function getModelInfo(modelName: string): Promise<Record<string, unknown>> {
  return invoke("get_ollama_model_info", {
    modelName,
    apiUrl: getApiUrl(),
  });
}

interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: (response: { totalDuration?: number; evalCount?: number }) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function chatStream(
  model: string,
  messages: Array<{ role: string; content: string }>,
  options: ChatOptions,
  systemPrompt: string | undefined,
  callbacks: StreamCallbacks
): Promise<void> {
  const apiUrl = getApiUrl();

  const body = JSON.stringify({
    model,
    messages,
    stream: true,
    options: {
      temperature: options.temperature,
      top_p: options.topP,
      top_k: options.topK,
      num_ctx: options.numCtx,
      num_predict: options.numPredict,
    },
    system: systemPrompt,
  });

  try {
    const response = await fetch(`${apiUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: callbacks.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      callbacks.onError(`Ollama error ${response.status}: ${errText}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            callbacks.onChunk(data.message.content);
          }
          if (data.done) {
            callbacks.onDone({
              totalDuration: data.total_duration,
              evalCount: data.eval_count,
            });
            return;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
    callbacks.onDone({});
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      callbacks.onDone({});
    } else {
      callbacks.onError(String(e));
    }
  }
}

export async function generateEmbeddings(
  model: string,
  text: string
): Promise<number[]> {
  try {
    return await invoke<number[]>("generate_embeddings", {
      model,
      text,
      apiUrl: getApiUrl(),
    });
  } catch {
    // Fallback: simple TF-IDF-like vector
    return simpleEmbedding(text);
  }
}

function simpleEmbedding(text: string): number[] {
  const dim = 128;
  const vec = new Array(dim).fill(0);
  const words = text.toLowerCase().split(/\W+/);
  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      const idx = (word.charCodeAt(i) * (i + 1)) % dim;
      vec[idx] += 1;
    }
  }
  // Normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / mag);
}
