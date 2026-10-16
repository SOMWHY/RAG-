"use client";

import { clsx } from "clsx";
import { AlertCircle, CheckCircle2, FileText, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import type { DocumentItem } from "@/lib/use-documents";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DocumentUpload } from "./document-upload";

interface DocumentListProps {
  documents: DocumentItem[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  /** 删除文档，返回是否成功（失败时列表会被刷新回来） */
  onDelete: (id: string) => Promise<boolean>;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: DocumentItem["status"] }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/15 px-2 py-0.5 text-[11px] text-accent-green">
        <CheckCircle2 className="size-3" /> 已就绪
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] text-brand-300">
        <Loader2 className="size-3 animate-spin" /> 处理中
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-red/15 px-2 py-0.5 text-[11px] text-accent-red">
      <AlertCircle className="size-3" /> 失败
    </span>
  );
}

export function DocumentList({
  documents,
  isLoading,
  selectedId,
  onSelect,
  onRefresh,
  onDelete,
}: DocumentListProps) {
  const [pendingDelete, setPendingDelete] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const closeDialog = () => {
    if (isDeleting) return;
    setPendingDelete(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    const ok = await onDelete(pendingDelete.id);
    setIsDeleting(false);
    setPendingDelete(null);
    // 成功后条目已被乐观移除，无需再刷新；失败时 hook 会把真实列表拉回来
    setDeleteError(ok ? null : "删除失败，请重试");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <DocumentUpload onUploaded={onRefresh} />

      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-ink-500">知识库</h3>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-ink-400">
          {documents.length} 篇
        </span>
      </div>

      {deleteError && (
        <p className="rounded-lg border border-accent-red/30 bg-accent-red/10 px-2.5 py-1.5 text-[11px] text-accent-red">
          {deleteError}
        </p>
      )}

      <div className="scrollbar-slim min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-ink-500" />
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-xs text-ink-500">
            还没有上传文档
          </div>
        ) : (
          documents.map((doc) => (
            // 外层是 div：删除按钮必须和主按钮并列，button 里不能再嵌 button
            <div key={doc.id} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(doc.id)}
                className={clsx(
                  "w-full rounded-xl border p-3 pr-11 text-left transition duration-150",
                  selectedId === doc.id
                    ? "border-brand-400/70 bg-brand-500/15 shadow-[0_0_20px_-8px_var(--color-brand-500)]"
                    : "border-white/10 bg-white/3 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0 text-brand-400">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-100">{doc.name}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-500">
                      <span>{formatSize(doc.size)}</span>
                      <span>·</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={doc.status} />
                      {doc.pageCount ? (
                        <span className="text-[11px] text-ink-500">{doc.pageCount} 页</span>
                      ) : null}
                      {doc.chunkCount > 0 && (
                        <span className="text-[11px] text-ink-500">{doc.chunkCount} 片段</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPendingDelete(doc)}
                title={`删除 ${doc.name}`}
                aria-label={`删除 ${doc.name}`}
                className={clsx(
                  "absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full border border-white/10",
                  "text-ink-400 transition duration-150 hover:border-accent-red/40 hover:bg-accent-red/15 hover:text-accent-red",
                  // 常态隐藏，悬停 / 聚焦 / 选中时显形；触屏没有 hover，改为常驻
                  "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
                  selectedId === doc.id && "opacity-100",
                )}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="删除文档"
        subject={pendingDelete?.name}
        description={`该文档的 ${pendingDelete?.chunkCount ?? 0} 个片段，连同摘要与思维导图将一并删除，且无法恢复。`}
        isPending={isDeleting}
        onConfirm={confirmDelete}
        onCancel={closeDialog}
      />
    </div>
  );
}
