import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Copy, Check, RefreshCw, Trash2, User, Bot, Globe, ExternalLink,
  ChevronDown, ChevronUp, Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import type { Message, SearchSource } from "../../types";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  onDelete?: () => void;
  onEdit?: (newContent: string) => void;
  isLast?: boolean;
}

export default function MessageBubble({
  message,
  onRegenerate,
  onDelete,
  onEdit,
  isLast,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showTimestamp, setShowTimestamp] = useState(false);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success(t("common.copied"));
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(editContent.trim());
    }
    setEditing(false);
  };

  if (message.role === "system") return null;

  return (
    <div
      className={clsx(
        "group flex gap-3 px-4 py-3 hover:bg-surface-1/30 transition-colors",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      {/* Avatar */}
      <div
        className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          isUser
            ? "bg-arkium-700 text-arkium-200"
            : "bg-surface-3 border border-border-1 text-zinc-400"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={clsx("flex-1 min-w-0", isUser ? "flex flex-col items-end" : "")}>
        {/* Streaming indicator */}
        {message.isStreaming && (
          <div className="thinking-dots mb-2">
            <span /><span /><span />
          </div>
        )}

        {/* Error indicator */}
        {message.isError && (
          <div className="mb-2 flex items-center gap-2 text-red-400 text-xs">
            <span>⚠️ Generation error</span>
          </div>
        )}

        {/* Message content */}
        {editing ? (
          <div className="w-full max-w-2xl">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full input-field min-h-24 resize-none"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleSaveEdit} className="btn-primary text-xs py-1">
                Save
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className={clsx(
              isUser
                ? "message-user"
                : "message-assistant prose-arkium max-w-none"
            )}
          >
            {isUser ? (
              <p className="text-sm text-zinc-100 whitespace-pre-wrap break-words">
                {message.content}
              </p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const code = String(children).replace(/\n$/, "");

                    if (!inline && match) {
                      return (
                        <div className="relative group/code my-3">
                          <div className="flex items-center justify-between bg-surface-1 border border-border-1 rounded-t-lg px-3 py-1.5">
                            <span className="text-xs text-zinc-500 font-mono">{match[1]}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(code);
                                toast.success("Code copied!");
                              }}
                              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              Copy
                            </button>
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            className="!rounded-t-none !rounded-b-lg !mt-0 !border !border-t-0 !border-border-1 text-sm"
                            {...props}
                          >
                            {code}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }
                    return (
                      <code className="bg-surface-3 px-1.5 py-0.5 rounded text-arkium-300 text-sm font-mono" {...props}>
                        {children}
                      </code>
                    );
                  },
                  a({ href, children, ...props }: any) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-arkium-400 hover:text-arkium-300 underline inline-flex items-center gap-1"
                        {...props}
                      >
                        {children}
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 w-full max-w-2xl">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>{t("chat.sources")} ({message.sources.length})</span>
              {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showSources && (
              <div className="mt-2 flex flex-col gap-1.5">
                {message.sources.map((src, i) => (
                  <SourceCard key={i} source={src} index={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-surface-3/50 border border-border-1 rounded-lg text-xs text-zinc-400"
              >
                📎 {att.name}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div
          className={clsx(
            "flex items-center gap-1 mt-1.5",
            isUser ? "flex-row-reverse" : ""
          )}
        >
          {showTimestamp && (
            <span className="text-xs text-zinc-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              {message.durationMs && ` • ${(message.durationMs / 1000).toFixed(1)}s`}
              {message.tokensUsed && ` • ${message.tokensUsed} tokens`}
            </span>
          )}

          <div className="hidden group-hover:flex items-center gap-0.5">
            <button
              onClick={handleCopy}
              className="p-1 text-zinc-600 hover:text-zinc-300 rounded transition-colors"
              title={t("common.copy")}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {isUser && onEdit && (
              <button
                onClick={() => setEditing(true)}
                className="p-1 text-zinc-600 hover:text-zinc-300 rounded transition-colors"
                title={t("chat.edit")}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {isAssistant && onRegenerate && isLast && (
              <button
                onClick={onRegenerate}
                className="p-1 text-zinc-600 hover:text-zinc-300 rounded transition-colors"
                title={t("chat.regenerate")}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 text-zinc-600 hover:text-red-400 rounded transition-colors"
                title={t("chat.delete")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceCard({ source, index }: { source: SearchSource; index: number }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 p-2 bg-surface-2 border border-border-1 rounded-lg hover:border-border-2 transition-colors"
    >
      <span className="text-xs font-mono text-arkium-500 mt-0.5 shrink-0">[{index}]</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-200 truncate">{source.title}</p>
        <p className="text-xs text-zinc-500 truncate">{source.domain}</p>
        {source.snippet && (
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{source.snippet}</p>
        )}
      </div>
      <ExternalLink className="w-3 h-3 text-zinc-600 shrink-0 mt-0.5" />
    </a>
  );
}
