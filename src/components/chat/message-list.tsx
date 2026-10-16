"use client";

import { clsx } from "clsx";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { MessageItem } from "./message-item";
import type { ChatUIMessage } from "@/lib/chat-message";

interface MessageListProps {
  messages: ChatUIMessage[];
  /** 流式生成中（已有语义：底部「正在检索文档…」提示） */
  isLoading: boolean;
  /** 切换 / 初次加载会话中：整块聊天区替换为骨架气泡 */
  isLoadingConversation?: boolean;
  suggestions: string[];
  onPickSuggestion: (value: string) => void;
  hasDocuments: boolean;
}

/** 骨架气泡：尺寸对齐真实气泡，避免加载完成时尺寸突变 */
function MessageSkeleton() {
  const rows = [
    { role: "user", height: "h-11", width: "w-[45%]" },
    { role: "assistant", height: "h-24", width: "w-[70%]" },
    { role: "user", height: "h-11", width: "w-[38%]" },
    { role: "assistant", height: "h-20", width: "w-[62%]" },
    { role: "user", height: "h-11", width: "w-[50%]" },
    { role: "assistant", height: "h-28", width: "w-[75%]" },
  ] as const;

  return (
    <div className="space-y-5">
      {rows.map((row, index) => (
        <div
          key={index}
          className={clsx("flex w-full gap-3", row.role === "user" ? "justify-end" : "justify-start")}
        >
          {row.role === "assistant" && (
            <div className="skeleton-shimmer mt-1 size-8 shrink-0 rounded-lg bg-white/4" />
          )}
          <div
            className={clsx(
              "skeleton-shimmer rounded-2xl bg-white/4",
              row.height,
              row.width,
            )}
          />
          {row.role === "user" && (
            <div className="skeleton-shimmer mt-1 size-8 shrink-0 rounded-lg bg-white/4" />
          )}
        </div>
      ))}
    </div>
  );
}

export function MessageList({
  messages,
  isLoading,
  isLoadingConversation = false,
  suggestions,
  onPickSuggestion,
  hasDocuments,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading, isLoadingConversation]);

  // 加载会话时不能走空态，否则会先闪一下「欢迎使用」再切到消息
  if (isLoadingConversation) {
    return (
      <div className="scrollbar-slim flex-1 overflow-y-auto p-4 sm:p-6">
        <MessageSkeleton />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="scrollbar-slim flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="animate-rise-in w-full max-w-lg text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl gradient-brand shadow-[0_0_40px_-8px_var(--color-brand-500)]">
            <Sparkles className="size-7 text-ink-950" />
          </div>
          <h2 className="text-xl font-semibold text-ink-100">欢迎使用 RAG 知识助手</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">
            {hasDocuments
              ? "文档已就绪，直接提问即可获得带来源追溯的回答。"
              : "先在左侧上传 PDF 或 Markdown 文档，系统会自动切分、向量化并建立索引。"}
          </p>

          {hasDocuments && suggestions.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPickSuggestion(item)}
                  className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-ink-300 transition duration-150 hover:-translate-y-0.5 hover:border-brand-400/60 hover:bg-brand-500/15 hover:text-ink-100"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="scrollbar-slim flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      {isLoading && (
        <div className="animate-rise-in flex items-center gap-2 pl-11 text-sm text-ink-400">
          <Loader2 className="size-4 animate-spin text-brand-400" />
          正在检索文档并生成回答…
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
