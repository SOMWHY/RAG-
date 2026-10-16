"use client";

import { BarChart3, ListChecks, RefreshCw, Sparkles, Tag, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DocumentSummary } from "@/lib/schema/summary";

interface SummaryPanelProps {
  summary: DocumentSummary | null;
  documentName: string;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
}

/**
 * 纯展示组件：摘要数据与加载 / 生成状态全部由父组件持有。
 *
 * 早先这些状态在组件内部，而它是按 tab 条件渲染的 —— 切到别的 tab 就卸载，
 * 切回来重新挂载又发一次请求，于是每看一次摘要都要等一次加载。
 * 现在和「思维导图」一样由父组件在打开面板时加载一次，切 tab 直接渲染。
 */
export function SummaryPanel({
  summary,
  documentName,
  isLoading,
  isGenerating,
  error,
  onGenerate,
}: SummaryPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((key) => (
          <div key={key} className="skeleton-shimmer h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.02] p-5 text-center">
        <Sparkles className="mx-auto mb-2 size-6 text-brand-400" />
        <p className="text-sm text-ink-300">尚未生成结构化摘要</p>
        <p className="mt-1 text-xs text-ink-500">将基于文档片段提炼核心观点、关键数据与结论</p>
        {error && <p className="mt-2 text-xs text-accent-red">{error}</p>}
        <Button className="mt-4" size="sm" disabled={isGenerating} onClick={onGenerate}>
          {isGenerating ? "生成中…" : "生成摘要"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-ink-100">{summary.title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-ink-400">{summary.abstract}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          title="重新生成"
          disabled={isGenerating}
          onClick={onGenerate}
        >
          <RefreshCw className={isGenerating ? "size-3.5 animate-spin" : "size-3.5"} />
        </Button>
      </div>

      {summary.keyPoints.length > 0 && (
        <section>
          <h5 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-400">
            <ListChecks className="size-3.5 text-brand-400" /> 核心观点
          </h5>
          <ul className="space-y-1.5">
            {summary.keyPoints.map((item, index) => (
              <li
                key={index}
                className="flex gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-ink-200"
              >
                {item.sourceRef && (
                  <span className="mt-px shrink-0 rounded bg-brand-500/20 px-1 text-[10px] font-semibold text-brand-300">
                    [{item.sourceRef}]
                  </span>
                )}
                <span className="min-w-0">{item.point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.keyData.length > 0 && (
        <section>
          <h5 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-400">
            <BarChart3 className="size-3.5 text-accent-cyan" /> 关键数据
          </h5>
          <div className="grid grid-cols-2 gap-2">
            {summary.keyData.map((item, index) => (
              <div
                key={index}
                className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2"
              >
                <p className="truncate text-[10px] text-ink-500">{item.label}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-accent-cyan">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {summary.conclusions.length > 0 && (
        <section>
          <h5 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-400">
            <Target className="size-3.5 text-accent-green" /> 结论
          </h5>
          <ol className="space-y-1.5">
            {summary.conclusions.map((item, index) => (
              <li
                key={index}
                className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-ink-200"
              >
                {item}
              </li>
            ))}
          </ol>
        </section>
      )}

      {summary.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Tag className="size-3.5 text-ink-500" />
          {summary.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-brand-400/30 bg-brand-500/10 px-2 py-0.5 text-[10px] text-brand-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-accent-red">{error}</p>}
      <p className="text-[10px] text-ink-500">摘要对象来自 {documentName}</p>
    </div>
  );
}
