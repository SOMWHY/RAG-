"use client";

import { clsx } from "clsx";
import { SendHorizonal, Square } from "lucide-react";
import { type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  value: string;
  isLoading: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
}

export function ChatInput({
  value,
  isLoading,
  disabled,
  onChange,
  onSubmit,
  onStop,
}: ChatInputProps) {
  const canSubmit = !isLoading && !disabled && value.trim().length > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-white/10 bg-ink-950/60 px-3 py-3 backdrop-blur-xl sm:px-5"
    >
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "请先上传文档再开始提问" : "基于已上传的文档提问…"}
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

      <p className="mt-2 hidden text-[11px] text-ink-500 sm:block">
        Enter 发送 · 回答仅基于已上传文档，附来源引用与相似度
      </p>
    </form>
  );
}
