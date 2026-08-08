import { chatStream } from "./ollama";
import { executeTool, TOOL_DEFINITIONS } from "./tools";
import type { AgentStep, AgentStatus, Message, ChatOptions } from "../types";
import { useSettingsStore } from "../stores/settingsStore";
import { useAppStore } from "../stores/appStore";

export interface AgentConfig {
  model: string;
  maxSteps?: number;
  timeoutMs?: number;
  options?: ChatOptions;
}

export interface AgentCallbacks {
  onStep: (step: AgentStep) => void;
  onChunk: (chunk: string) => void;
  onDone: (finalResponse: string) => void;
  onError: (error: string) => void;
  onStatusChange: (status: AgentStatus) => void;
}

const AGENT_SYSTEM_PROMPT = `You are ARKIUM, an AI agent that can use tools to complete tasks.

You have access to the following tools:
{{TOOLS}}

To use a tool, respond with JSON in this exact format on its own line:
<tool_call>
{"name": "tool_name", "input": {"param": "value"}}
</tool_call>

After receiving the tool result, continue your response.

RULES:
- Only use tools when necessary
- Always verify results before presenting them
- Never invent information — use tools to get real data
- Be concise in your reasoning
- If a tool fails, try an alternative approach
- For file operations, always confirm the path exists first
- Present final answers clearly without showing internal reasoning`;

export async function runAgent(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  config: AgentConfig,
  callbacks: AgentCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const maxSteps = config.maxSteps ?? 10;
  const settings = useSettingsStore.getState();

  const toolDescriptions = TOOL_DEFINITIONS.map(
    (t) =>
      `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`
  ).join("\n");

  const systemPrompt = AGENT_SYSTEM_PROMPT.replace("{{TOOLS}}", toolDescriptions);

  const messages = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  let steps = 0;
  let fullResponse = "";
  let continueLoop = true;

  callbacks.onStatusChange("planning");

  while (continueLoop && steps < maxSteps) {
    if (abortSignal?.aborted) {
      callbacks.onStatusChange("cancelled");
      break;
    }

    steps++;
    let currentResponse = "";

    await new Promise<void>((resolve) => {
      chatStream(
        config.model,
        messages,
        config.options || { temperature: 0.7, numCtx: 4096 },
        systemPrompt,
        {
          onChunk: (chunk) => {
            currentResponse += chunk;
            // Only show to user if not a tool call in progress
            if (!currentResponse.includes("<tool_call>") || currentResponse.includes("</tool_call>")) {
              const displayContent = currentResponse.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
              if (displayContent) {
                callbacks.onChunk(chunk);
              }
            }
          },
          onDone: () => resolve(),
          onError: (error) => {
            callbacks.onError(error);
            continueLoop = false;
            resolve();
          },
          signal: abortSignal,
        }
      );
    });

    fullResponse += currentResponse;

    // Check for tool calls
    const toolCallMatch = currentResponse.match(/<tool_call>([\s\S]*?)<\/tool_call>/);

    if (toolCallMatch) {
      callbacks.onStatusChange("executing");

      let toolCallData: { name: string; input: Record<string, unknown> };
      try {
        toolCallData = JSON.parse(toolCallMatch[1].trim());
      } catch (e) {
        callbacks.onError(`Failed to parse tool call: ${e}`);
        continueLoop = false;
        break;
      }

      const step: AgentStep = {
        id: crypto.randomUUID(),
        type: "action",
        tool: toolCallData.name,
        input: toolCallData.input,
        startedAt: new Date().toISOString(),
      };

      callbacks.onStep(step);

      // Execute the tool
      let toolResult: unknown;
      let toolError: string | undefined;

      try {
        toolResult = await executeTool(
          toolCallData.name,
          toolCallData.input,
          undefined
        );
        step.output = toolResult;
        step.completedAt = new Date().toISOString();
        callbacks.onStep({ ...step, type: "observation" });
      } catch (e) {
        toolError = String(e);
        step.error = toolError;
        step.completedAt = new Date().toISOString();
        callbacks.onStep({ ...step, type: "observation" });
      }

      // Add tool result to messages for next iteration
      const resultContent = toolError
        ? `Tool "${toolCallData.name}" failed: ${toolError}`
        : `Tool "${toolCallData.name}" result:\n${JSON.stringify(toolResult, null, 2)}`;

      messages.push({ role: "assistant", content: currentResponse });
      messages.push({ role: "user", content: `<tool_result>${resultContent}</tool_result>` });

      callbacks.onStatusChange("planning");
    } else {
      // No tool call - agent is done
      continueLoop = false;
    }
  }

  if (steps >= maxSteps) {
    callbacks.onChunk("\n\n[Agent reached maximum steps limit]");
  }

  callbacks.onStatusChange("complete");
  callbacks.onDone(fullResponse);
}

export function parseAgentThought(response: string): {
  thoughts: string;
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>;
  finalAnswer: string;
} {
  const toolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];
  const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;

  let match;
  while ((match = toolCallRegex.exec(response)) !== null) {
    try {
      toolCalls.push(JSON.parse(match[1].trim()));
    } catch {
      // Skip malformed tool calls
    }
  }

  const finalAnswer = response
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
    .replace(/<tool_result>[\s\S]*?<\/tool_result>/g, "")
    .trim();

  return {
    thoughts: "",
    toolCalls,
    finalAnswer,
  };
}
