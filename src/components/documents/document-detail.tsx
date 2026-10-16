"use client";

import { Network, RefreshCw, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MindmapView } from "@/components/mindmap/mindmap-view";
import { SummaryPanel } from "@/components/summary/summary-panel";
import type { Mindmap } from "@/lib/schema/mindmap";
import type { DocumentItem } from "@/lib/use-documents";

type ChunkRow = {
  id: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  tokenCount: number | null;
};

interface DocumentDetailProps {
  document: DocumentItem;
  onClose: () => void;
  onUpdated: () => void;
}

type Tab = "summary" | "mindmap" | "chunks";

export function DocumentDetail({ document, onClose, onUpdated }: DocumentDetailProps) {
  const [chunks, setChunks] = useState<ChunkRow[]>([]);
  const [mindmap, setMindmap] = useState<Mindmap | null>(null);
  const [mindmapLoading, setMindmapLoading] = useState(true);
  const [mindmapGenerating, setMindmapGenerating] = useState(false);
  const [tab, setTab] = useState<Tab>("summary");
  const [error, setError] = useState<string | null>(null);

  const loadChunks = useCallback(async () => {
    try {
      const response = await fetch(`/api/documents/${document.id}`, { cache: "no-store" });
      if (!response.ok) throw new Error("读取文档详情失败");
      const data = (await response.json()) as { chunks: ChunkRow[] };
      setChunks(data.chunks);
    } catch (cause) {
      console.error("load chunks failed", cause);
    }
  }, [document.id]);

  const loadMindmap = useCallback(async () => {
    setMindmapLoading(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/mindmap`, { cache: "no-store" });
      if (!response.ok) throw new Error("读取思维导图失败");
      const data = (await response.json()) as { mindmap: Mindmap | null };
      setMindmap(data.mindmap);
    } catch (cause) {
      console.error("load mindmap failed", cause);
    } finally {
      setMindmapLoading(false);
    }
  }, [document.id]);

  useEffect(() => {
    void loadChunks();
    void loadMindmap();
  }, [loadChunks, loadMindmap]);

  const generateMindmap = async () => {
    setMindmapGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${document.id}/mindmap`, { method: "POST" });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "生成思维导图失败");
      }
      setMindmap((await response.json()) as Mindmap);
      onUpdated();
    } catch (cause) {
      console.error("generate mindmap failed", cause);
      setError(cause instanceof Error ? cause.message : "生成思维导图失败");
    } finally {
      setMindmapGenerating(false);
    }
  };

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "summary", label: "结构化摘要" },
    { key: "mindmap", label: "思维导图" },
    { key: "chunks", label: `原文片段 (${chunks.length})` },
  ];

  return (
    <section className="animate-rise-in flex h-full w-full flex-col overflow-hidden border-l border-white/10 bg-ink-900/80 backdrop-blur-2xl lg:w-[520px]">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink-100">{document.name}</h3>
          <p className="mt-0.5 text-[11px] text-ink-500">
            {document.chunkCount} 片段
            {document.pageCount ? ` · ${document.pageCount} 页` : ""} ·{" "}
            {document.status === "ready" ? "已就绪" : document.status}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-ink-400 transition hover:bg-white/8 hover:text-ink-100"
          title="关闭详情"
        >
          <X className="size-4" />
        </button>
      </header>

      <nav className="flex shrink-0 gap-1 border-b border-white/10 px-3 py-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-lg px-2.5 py-1.5 text-xs transition ${
              tab === item.key
                ? "bg-brand-500/20 text-brand-200"
                : "text-ink-400 hover:bg-white/5 hover:text-ink-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-4">
        {document.status !== "ready" ? (
          <p className="rounded-xl border border-dashed border-white/12 p-5 text-center text-xs text-ink-500">
            文档处理完成后才能生成摘要与导图
          </p>
        ) : tab === "summary" ? (
          <SummaryPanel
            documentId={document.id}
            documentName={document.name}
            onGenerated={onUpdated}
          />
        ) : tab === "mindmap" ? (
          mindmapLoading ? (
            <div className="skeleton-shimmer h-[380px] rounded-xl" />
          ) : mindmap ? (
            <div className="space-y-3">
              <MindmapView mindmap={mindmap} />
              <Button
                variant="ghost"
                size="sm"
                disabled={mindmapGenerating}
                onClick={() => void generateMindmap()}
              >
                <RefreshCw className={mindmapGenerating ? "size-3.5 animate-spin" : "size-3.5"} />
                重新生成
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/12 p-5 text-center">
              <Network className="mx-auto mb-2 size-6 text-accent-cyan" />
              <p className="text-sm text-ink-300">尚未生成思维导图</p>
              <p className="mt-1 text-xs text-ink-500">将文档结构整理为可折叠的主题树</p>
              {error && <p className="mt-2 text-xs text-accent-red">{error}</p>}
              <Button
                className="mt-4"
                size="sm"
                disabled={mindmapGenerating}
                onClick={() => void generateMindmap()}
              >
                {mindmapGenerating ? "生成中…" : "生成思维导图"}
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-2">
            {chunks.length === 0 ? (
              <p className="text-xs text-ink-500">暂无片段</p>
            ) : (
              chunks.map((chunk) => (
                <article
                  key={chunk.id}
                  className="rounded-xl border border-white/8 bg-white/[0.03] p-3"
                >
                  <div className="mb-1.5 flex items-center gap-2 text-[10px] text-ink-500">
                    <span className="rounded bg-white/5 px-1.5 py-0.5">#{chunk.chunkIndex + 1}</span>
                    {chunk.pageNumber && <span>第 {chunk.pageNumber} 页</span>}
                    {chunk.tokenCount && <span>≈ {chunk.tokenCount} tokens</span>}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-300">
                    {chunk.content}
                  </p>
                </article>
              ))
            )}
          </div>
        )}

        {error && tab === "mindmap" && mindmap && (
          <p className="mt-2 text-xs text-accent-red">{error}</p>
        )}
      </div>

      <footer className="flex shrink-0 items-center gap-1.5 border-t border-white/10 px-4 py-2 text-[10px] text-ink-500">
        <Sparkles className="size-3 text-brand-400" />
        摘要与导图由结构化输出生成，内容以原文片段为准
      </footer>
    </section>
  );
}
