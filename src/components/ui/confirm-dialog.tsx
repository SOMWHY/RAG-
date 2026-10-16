"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** 操作对象，加粗展示，超长截断 */
  subject?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 请求进行中：禁用所有操作，避免重复提交 */
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  subject,
  description,
  confirmLabel = "删除",
  cancelLabel = "取消",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // 焦点默认落在「取消」：连按回车不会误删
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isPending, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="关闭"
        onClick={() => !isPending && onCancel()}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="glass-panel relative w-full max-w-sm animate-rise-in rounded-2xl p-6"
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-ink-100">
          {title}
        </h2>

        {subject && (
          <p className="mt-2 truncate text-[13px] font-medium text-ink-200" title={subject}>
            {subject}
          </p>
        )}

        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{description}</p>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "处理中…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
