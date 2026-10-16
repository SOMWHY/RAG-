"use client";

import { useCallback, useEffect, useState } from "react";

export type DocumentItem = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  status: "processing" | "ready" | "failed";
  createdAt: string;
  pageCount: number | null;
  chunkCount: number;
  hasSummary: boolean;
  hasMindmap: boolean;
};

type RawDocument = Partial<DocumentItem> & { id: string; name: string };

/** 兼容后端字段逐步补齐的过程，缺字段时给出安全默认值 */
function normalize(raw: RawDocument): DocumentItem {
  return {
    id: raw.id,
    name: raw.name,
    mimeType: raw.mimeType ?? "text/markdown",
    size: raw.size ?? 0,
    status: (raw.status as DocumentItem["status"]) ?? "processing",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    pageCount: raw.pageCount ?? null,
    chunkCount: raw.chunkCount ?? 0,
    hasSummary: Boolean(raw.hasSummary),
    hasMindmap: Boolean(raw.hasMindmap),
  };
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/documents", { cache: "no-store" });
      if (!response.ok) throw new Error("获取文档列表失败");
      const data = (await response.json()) as RawDocument[];
      setDocuments(data.map(normalize));
      setError(null);
    } catch (cause) {
      console.error("fetch documents failed", cause);
      setError(cause instanceof Error ? cause.message : "获取文档列表失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { documents, isLoading, error, refresh };
}
