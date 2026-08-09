import { useState } from "react";
import { Bot, ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2, Wrench } from "lucide-react";
import { clsx } from "clsx";
import type { AgentStep, AgentStatus } from "../../types";

interface AgentStepsPanelProps {
  steps: AgentStep[];
  status: AgentStatus;
  onCancel?: () => void;
}

export default function AgentStepsPanel({ steps, status, onCancel }: AgentStepsPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (steps.length === 0 && status === "idle") return null;

  const statusConfig = {
    idle: { label: "Agent ready", color: "text-zinc-400" },
    planning: { label: "Planning...", color: "text-blue-400" },
    executing: { label: "Executing...", color: "text-yellow-400" },
    waiting: { label: "Waiting...", color: "text-zinc-400" },
    complete: { label: "Complete", color: "text-green-400" },
    error: { label: "Error", color: "text-red-400" },
    cancelled: { label: "Cancelled", color: "text-zinc-500" },
  };

  const cfg = statusConfig[status];

  return (
    <div className="mx-4 mb-2 bg-surface-2 border border-border-1 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-3/50 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <Bot className="w-4 h-4 text-purple-400 shrink-0" />
        <span className="text-xs font-medium text-zinc-300">Agent</span>
        <span className={clsx("text-xs ml-1", cfg.color)}>{cfg.label}</span>

        {(status === "planning" || status === "executing") && (
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin ml-1" />
        )}

        <div className="ml-auto flex items-center gap-2">
          {steps.length > 0 && (
            <span className="text-xs text-zinc-600">{steps.length} steps</span>
          )}
          {(status === "planning" || status === "executing") && onCancel && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 border border-red-800/50 rounded"
            >
              Cancel
            </button>
          )}
          {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />}
        </div>
      </div>

      {/* Steps */}
      {!collapsed && steps.length > 0 && (
        <div className="border-t border-border-1 divide-y divide-border-1/50">
          {steps.map((step) => (
            <AgentStepRow key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentStepRow({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(false);

  const icons = {
    thought: <Bot className="w-3.5 h-3.5 text-blue-400" />,
    action: <Wrench className="w-3.5 h-3.5 text-yellow-400" />,
    observation: step.error
      ? <XCircle className="w-3.5 h-3.5 text-red-400" />
      : <CheckCircle className="w-3.5 h-3.5 text-green-400" />,
    final: <CheckCircle className="w-3.5 h-3.5 text-green-400" />,
  };

  const hasDetails = step.input || step.output || step.error;

  return (
    <div className="px-3 py-2">
      <div
        className={clsx(
          "flex items-center gap-2",
          hasDetails && "cursor-pointer"
        )}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {icons[step.type]}
        <span className="text-xs text-zinc-400">
          {step.type === "action" && step.tool ? (
            <>Using <span className="font-mono text-yellow-400">{step.tool}</span></>
          ) : step.type === "observation" ? (
            step.error ? "Tool failed" : "Tool result received"
          ) : step.type === "thought" ? (
            "Thinking..."
          ) : (
            "Completed"
          )}
        </span>

        {hasDetails && (
          <div className="ml-auto">
            {expanded ? <ChevronUp className="w-3 h-3 text-zinc-600" /> : <ChevronDown className="w-3 h-3 text-zinc-600" />}
          </div>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="mt-1.5 pl-5">
          {step.input && (
            <pre className="text-xs text-zinc-500 bg-surface-1 p-2 rounded overflow-x-auto max-h-32">
              {JSON.stringify(step.input, null, 2)}
            </pre>
          )}
          {step.error && (
            <p className="text-xs text-red-400 mt-1">{step.error}</p>
          )}
          {step.output != null && !step.error && (
            <OutputPreview output={step.output} />
          )}
        </div>
      )}
    </div>
  );
}

function OutputPreview({ output }: { output: unknown }) {
  const text =
    typeof output === "string"
      ? output
      : JSON.stringify(output, null, 2);
  const preview = text.length > 500 ? text.slice(0, 500) + "..." : text;
  return (
    <pre className="text-xs text-zinc-400 bg-surface-1 p-2 rounded overflow-x-auto max-h-32 mt-1">
      {preview}
    </pre>
  );
}
