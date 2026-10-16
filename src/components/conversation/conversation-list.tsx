"use client";

import { clsx } from "clsx";
import { Loader2, MessageSquarePlus, MessagesSquare, Trash2 } from "lucide-react";
import type { ConversationItem } from "@/lib/use-conversations";

interface ConversationListProps {
  conversations: ConversationItem[];
  isLoading: boolean;
  /** 新建会话请求中 */
  isCreating: boolean;
  /** 正在拉取消息的会话 id */
  loadingId: string | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRemove: (id: string) => void;
}

function formatTime(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function ConversationList({
  conversations,
  isLoading,
  isCreating,
  loadingId,
  activeId,
  onSelect,
  onCreate,
  onRemove,
}: ConversationListProps) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-ink-500">会话历史</h3>
        <button
          type="button"
          onClick={onCreate}
          disabled={isCreating}
          title="新建会话"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-ink-400 transition hover:bg-white/8 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <MessageSquarePlus className="size-3.5" />
          )}{" "}
          新建
        </button>
      </div>

      <div className="scrollbar-slim max-h-52 min-h-0 space-y-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-4 animate-spin text-ink-500" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-1 py-3 text-[11px] text-ink-500">还没有历史会话</p>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={clsx(
                "group flex items-center gap-1 rounded-lg border px-2 py-1.5 transition duration-150",
                activeId === conversation.id
                  ? "border-brand-400/70 bg-brand-500/15"
                  : "border-transparent hover:border-white/12 hover:bg-white/5",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(conversation.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                {loadingId === conversation.id ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-brand-300" />
                ) : (
                  <MessagesSquare
                    className={clsx(
                      "size-3.5 shrink-0",
                      activeId === conversation.id ? "text-brand-300" : "text-ink-500",
                    )}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-ink-200">{conversation.title}</span>
                  <span className="block text-[10px] text-ink-500">
                    {formatTime(conversation.updatedAt)}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(conversation.id)}
                title="删除会话"
                className="shrink-0 rounded p-1 text-ink-500 opacity-0 transition hover:bg-accent-red/15 hover:text-accent-red group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
