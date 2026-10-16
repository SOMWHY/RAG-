"use client";

import { clsx } from "clsx";
import { SendHorizonal, Square, X } from "lucide-react";
import { type ChangeEvent, type FormEvent, type KeyboardEvent, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { detectMention, stripMention, type MentionToken } from "@/lib/mention";
import type { DocumentItem } from "@/lib/use-documents";

/** 弹层最多显示多少条候选，避免文档多时铺满屏幕 */
const MAX_CANDIDATES = 8;

interface ChatInputProps {
  value: string;
  isLoading: boolean;
  disabled: boolean;
  documents: DocumentItem[];
  selectedDocIds: string[];
  onSelectedDocIdsChange: (ids: string[]) => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
}

export function ChatInput({
  value,
  isLoading,
  disabled,
  documents,
  selectedDocIds,
  onSelectedDocIdsChange,
  onChange,
  onSubmit,
  onStop,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mention, setMention] = useState<MentionToken | null>(null);
  const [highlight, setHighlight] = useState(0);

  const canSubmit = !isLoading && !disabled && value.trim().length > 0;

  // 只有已就绪的文档能被检索到，未就绪的不作为候选
  const readyDocs = useMemo(
    () => documents.filter((doc) => doc.status === "ready"),
    [documents],
  );

  const selectedDocs = useMemo(
    () =>
      selectedDocIds
        .map((id) => readyDocs.find((doc) => doc.id === id))
        .filter((doc): doc is DocumentItem => Boolean(doc)),
    [selectedDocIds, readyDocs],
  );

  const candidates = useMemo(() => {
    if (!mention) return [];
    const keyword = mention.query.toLowerCase();
    return readyDocs
      .filter(
        (doc) => !selectedDocIds.includes(doc.id) && doc.name.toLowerCase().includes(keyword),
      )
      .slice(0, MAX_CANDIDATES);
  }, [mention, readyDocs, selectedDocIds]);

  const isPickerOpen = Boolean(mention) && candidates.length > 0;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    const caret = event.target.selectionStart ?? next.length;
    onChange(next);
    setMention(detectMention(next, caret));
    setHighlight(0);
  };

  const selectDocument = (doc: DocumentItem) => {
    if (!mention) return;
    const token = mention;
    onChange(stripMention(value, token));
    onSelectedDocIdsChange([...selectedDocIds, doc.id]);
    setMention(null);
    setHighlight(0);

    // 光标退回到被删掉的 "@查询词" 处，保证后面接着输入时位置正确
    requestAnimationFrame(() => {
      const element = inputRef.current;
      if (!element) return;
      element.focus();
      const position = Math.min(token.start, element.value.length);
      element.setSelectionRange(position, position);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 输入法组合中（中文候选词还没上屏）一律不处理，避免打断输入
    if (event.nativeEvent.isComposing) return;

    if (isPickerOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlight((index) => (index + 1) % candidates.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlight((index) => (index - 1 + candidates.length) % candidates.length);
        return;
      }
      // 弹层打开时 Enter 是「选中」而不是「发送」，否则会误发消息
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const picked = candidates[highlight];
        if (picked) selectDocument(picked);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMention(null);
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-white/10 bg-white/3 px-3 py-3 backdrop-blur-2xl sm:px-5"
    >
      {selectedDocs.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-ink-500">本次提问限定</span>
          {selectedDocs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelectedDocIdsChange(selectedDocIds.filter((id) => id !== doc.id))}
              title={`取消指定 ${doc.name}`}
              className="flex max-w-[14rem] items-center gap-1 rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-[11px] text-brand-300 transition hover:border-brand-500/60"
            >
              <span className="truncate">{doc.name}</span>
              <X className="size-3 shrink-0" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSelectedDocIdsChange([])}
            className="text-[11px] text-ink-500 transition hover:text-ink-300"
          >
            清除
          </button>
        </div>
      )}

      <div className="relative">
        {isPickerOpen && (
          <div className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-xl border border-white/10 bg-ink-900/95 shadow-xl backdrop-blur">
            <ul className="max-h-56 overflow-y-auto py-1">
              {candidates.map((doc, index) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    // 阻止默认行为以免输入框失焦（失焦会立刻关闭弹层，点击就失效了）
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => selectDocument(doc)}
                    className={clsx(
                      "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition",
                      index === highlight ? "bg-white/10 text-ink-100" : "text-ink-300",
                    )}
                  >
                    <span className="truncate">{doc.name}</span>
                    <span className="shrink-0 text-[11px] text-ink-500">{doc.chunkCount} 片段</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setMention(null)}
            placeholder={disabled ? "请先上传文档再开始提问" : "基于文档提问，输入 @ 指定文档…"}
            disabled={disabled}
            className="flex-1"
          />

          {isLoading ? (
            <Button
              type="button"
              size="icon"
              onClick={onStop}
              aria-label="停止生成"
              className="bg-ink-800 text-ink-200 hover:bg-ink-700"
            >
              <Square className="size-4 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!canSubmit}
              aria-label="发送"
              className={clsx(!canSubmit && "opacity-60")}
            >
              <SendHorizonal className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="mt-2 hidden text-[11px] text-ink-500 sm:block">
        输入 @ 指定文档，可多选 · Enter 发送 · 回答仅基于已上传文档
      </p>
    </form>
  );
}
