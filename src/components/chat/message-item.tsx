"use client";

import { clsx } from "clsx";
import { FileText, Sparkles, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getMessageText, type ChatUIMessage } from "@/lib/chat-message";

interface MessageItemProps {
  message: ChatUIMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const text = getMessageText(message);
  const sources = message.metadata?.sources ?? [];

  return (
    <div
      className={clsx(
        "animate-rise-in flex w-full gap-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg gradient-brand shadow-[0_0_18px_-4px_var(--color-brand-500)]">
          <Sparkles className="size-4 text-ink-950" />
        </div>
      )}

      <div className={clsx("flex min-w-0 flex-col gap-2", isUser ? "items-end" : "items-start")}>
        <div
          className={clsx(
            "rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
            isUser
              ? "max-w-[80%] border border-white/15 bg-white/10 text-ink-100 backdrop-blur-xl"
              : "glass-card max-w-[86%] text-ink-200",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap wrap-break-word">{text}</p>
          ) : (
            <div className="prose-rag">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && sources.length > 0 && (
          <div className="max-w-[86%] rounded-xl border border-white/10 bg-ink-950/50 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-400">
              <FileText className="size-3.5" />
              来源引用 · {sources.length} 条
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((source, index) => (
                <div
                  key={source.id}
                  title={`相似度 ${(source.score * 100).toFixed(0)}%`}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-ink-300 transition duration-150 hover:-translate-y-0.5 hover:border-brand-400/60 hover:bg-brand-500/15 hover:text-ink-100"
                >
                  <span className="font-semibold text-brand-400">[{index + 1}]</span>
                  <span className="max-w-[14rem] truncate">{source.documentName}</span>
                  {source.pageNumber && (
                    <span className="text-ink-400">· 第 {source.pageNumber} 页</span>
                  )}
                  <span className="rounded bg-accent-cyan/15 px-1 text-[10px] text-accent-cyan">
                    {(source.score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-800">
          <User className="size-4 text-ink-300" />
        </div>
      )}
    </div>
  );
}
