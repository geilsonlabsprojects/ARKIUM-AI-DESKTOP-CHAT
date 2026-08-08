// ============================================================
// Core Types for ARKIUM AI Desktop Chat
// ============================================================

// --- Chat ---

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  thinking?: string;
  model?: string;
  tokensUsed?: number;
  durationMs?: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
  attachments?: Attachment[];
  sources?: SearchSource[];
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  systemPrompt?: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  lastMessage?: string;
  messageCount?: number;
}

export interface Attachment {
  id: string;
  name: string;
  path?: string;
  content?: string;
  mimeType: string;
  size: number;
  base64?: string;
}

// --- Ollama ---

export interface OllamaModel {
  name: string;
  modifiedAt: string;
  size: number;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameterSize?: string;
    quantizationLevel?: string;
  };
}

export interface OllamaStatus {
  installed: boolean;
  running: boolean;
  apiAvailable: boolean;
  apiUrl: string;
  version?: string;
  modelsCount: number;
  error?: string;
}

export interface ChatOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  numCtx?: number;
  numPredict?: number;
  stop?: string[];
  seed?: number;
  repeatPenalty?: number;
}

// --- Search ---

export interface SearchSource {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedDate?: string;
  source: string;
}

export interface SearchResponse {
  query: string;
  results: SearchSource[];
  engine: string;
  totalResults: number;
  error?: string;
}

// --- Agent & Tools ---

export type AgentStatus =
  | "idle"
  | "planning"
  | "executing"
  | "waiting"
  | "complete"
  | "error"
  | "cancelled";

export interface AgentStep {
  id: string;
  type: "thought" | "action" | "observation" | "final";
  tool?: string;
  input?: Record<string, unknown>;
  output?: unknown;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  status: "pending" | "running" | "success" | "error";
  startedAt: string;
  completedAt?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  requiresPermission: boolean;
  riskLevel: "low" | "medium" | "high";
}

// --- Prompts ---

export type PromptCategory =
  | "general"
  | "coding"
  | "writing"
  | "analysis"
  | "creative"
  | "research"
  | "custom";

export interface Prompt {
  id: string;
  title: string;
  content: string;
  category: PromptCategory;
  tags: string[];
  isFavorite: boolean;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

// --- Files ---

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modified?: string;
  extension?: string;
  isHidden: boolean;
}

export interface FileMetadata {
  path: string;
  name: string;
  extension?: string;
  size: number;
  isDir: boolean;
  isFile: boolean;
  isReadonly: boolean;
  created?: string;
  modified?: string;
  mimeType: string;
}

// --- Projects ---

export interface Project {
  id: string;
  name: string;
  path: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastOpened?: string;
  metadata?: Record<string, unknown>;
}

// --- Memory ---

export type MemoryType = "conversation" | "project" | "preference" | "fact";

export interface Memory {
  id: string;
  type: MemoryType;
  key: string;
  value: string;
  conversationId?: string;
  projectId?: string;
  importance: number;
  createdAt: string;
  updatedAt: string;
}

// --- Settings ---

export interface AISettings {
  defaultModel: string;
  temperature: number;
  topP: number;
  numCtx: number;
  streaming: boolean;
  systemPrompt: string;
}

export interface OllamaSettings {
  apiUrl: string;
  timeoutSeconds: number;
}

export interface SearchSettings {
  engine: "duckduckgo" | "brave" | "searxng";
  maxResults: number;
  language: string;
  region: string;
  timeoutSeconds: number;
  autoSearch: boolean;
}

export interface FileSettings {
  workingDirectory: string;
  maxFileSizeMB: number;
  allowedExtensions: string[];
}

export interface SecuritySettings {
  confirmCommands: boolean;
  confirmDeletions: boolean;
  readOnlyMode: boolean;
  allowNetworkAccess: boolean;
}

export interface InterfaceSettings {
  theme: "dark" | "light" | "system";
  language: string;
  fontSize: "small" | "medium" | "large";
  showLineNumbers: boolean;
  compactMode: boolean;
}

export interface AppSettings {
  ai: AISettings;
  ollama: OllamaSettings;
  search: SearchSettings;
  files: FileSettings;
  security: SecuritySettings;
  interface: InterfaceSettings;
}

// --- System ---

export interface SystemInfo {
  os: string;
  osVersion: string;
  arch: string;
  hostname: string;
  username: string;
  homeDir: string;
  cpuCount: number;
  totalMemoryGb: number;
  availableMemoryGb: number;
}

export interface HardwareInfo {
  cpuBrand: string;
  cpuCount: number;
  totalMemoryMb: number;
  availableMemoryMb: number;
  osName: string;
  osVersion: string;
  arch: string;
  hasGpu: boolean;
  gpuInfo: string[];
}

// --- Logs ---

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// --- Permission ---

export interface PermissionRequest {
  id: string;
  action: string;
  resource: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  resolve: (granted: boolean, remember: boolean) => void;
}

// --- Terminal ---

export interface TerminalCommand {
  id: string;
  command: string;
  args?: string[];
  cwd?: string;
  description?: string;
  resolve: (confirmed: boolean) => void;
}

export interface CommandResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
  executedAt: string;
  durationMs: number;
}

// --- RAG ---

export interface IndexedDocument {
  id: string;
  name: string;
  path: string;
  docType: string;
  chunksCount: number;
  indexedAt: string;
  size: number;
}

// --- ZIP ---

export interface ZipResult {
  path: string;
  size: number;
  filesCount: number;
  success: boolean;
  error?: string;
}

// --- Welcome ---

export interface WelcomeCheck {
  name: string;
  status: "pending" | "checking" | "ok" | "warning" | "error";
  message?: string;
}
