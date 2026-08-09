import { invoke } from "@tauri-apps/api/core";
import type { OllamaModel, OllamaStatus, ChatOptions } from "../types";
import { useSettingsStore } from "../stores/settingsStore";
import { useAppStore } from "../stores/appStore";

function getApiUrl(): string {
  return useSettingsStore.getState().ollama.apiUrl || "http://localhost:11434";
}

// Raw response from Tauri (snake_case fields from Rust)
interface RawOllamaStatus {
  installed: boolean;
  running: boolean;
  api_available?: boolean;
  apiAvailable?: boolean;
  api_url?: string;
  apiUrl?: string;
  version?: string;
  models_count?: number;
  modelsCount?: number;
  error?: string;
}

export async function checkOllamaStatus(): Promise<OllamaStatus> {
  try {
    const raw = await invoke<RawOllamaStatus>("check_ollama_status", {
      apiUrl: getApiUrl(),
    });
    const status: OllamaStatus = {
      installed: raw.installed,
      running: raw.running,
      apiAvailable: raw.api_available ?? raw.apiAvailable ?? false,
      apiUrl: raw.api_url ?? raw.apiUrl ?? getApiUrl(),
      version: raw.version,
      modelsCount: raw.models_count ?? raw.modelsCount ?? 0,
      error: raw.error,
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

interface RawOllamaModel {
  name: string;
  modified_at?: string;
  modifiedAt?: string;
  size: number;
  digest: string;
  details?: OllamaModel["details"];
}

export async function listModels(): Promise<OllamaModel[]> {
  try {
    const raw = await invoke<RawOllamaModel[]>("list_ollama_models", {
      apiUrl: getApiUrl(),
    });
    return raw.map((m) => ({
      name: m.name,
      modifiedAt: m.modified_at ?? m.modifiedAt ?? "",
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

export async function getModelInfo(
  modelName: string
): Promise<Record<string, unknown>> {
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
      buffer = lines.pop() ?? "";

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
          // Skip malformed JSON lines
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
    return simpleEmbedding(text);
  }
}

function simpleEmbedding(text: string): number[] {
  const dim = 128;
  const vec = new Array<number>(dim).fill(0);
  const words = text.toLowerCase().split(/\W+/);
  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      const idx = (word.charCodeAt(i) * (i + 1)) % dim;
      vec[idx] += 1;
    }
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / mag);
}
