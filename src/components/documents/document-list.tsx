"use client";

import { clsx } from "clsx";
import { AlertCircle, CheckCircle2, FileText, Loader2 } from "lucide-react";
import type { DocumentItem } from "@/lib/use-documents";
import { DocumentUpload } from "./document-upload";

interface DocumentListProps {
  documents: DocumentItem[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
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
}: DocumentListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <DocumentUpload onUploaded={onRefresh} />

      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-ink-500">知识库</h3>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-ink-400">
          {documents.length} 篇
        </span>
      </div>

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
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelect(doc.id)}
              className={clsx(
                "w-full rounded-xl border p-3 text-left transition duration-150",
                selectedId === doc.id
                  ? "border-brand-400/70 bg-brand-500/15 shadow-[0_0_20px_-8px_var(--color-brand-500)]"
                  : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]",
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
          ))
        )}
      </div>
    </div>
  );
}
