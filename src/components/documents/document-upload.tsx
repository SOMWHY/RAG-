"use client";

import { clsx } from "clsx";
import { Loader2, UploadCloud } from "lucide-react";
import { type ChangeEvent, type DragEvent, useRef, useState } from "react";

interface DocumentUploadProps {
  onUploaded: () => void;
}

export function DocumentUpload({ onUploaded }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/documents", { method: "POST", body: formData });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "上传失败");
      }
      onUploaded();
    } catch (cause) {
      console.error("upload failed", cause);
      setError(cause instanceof Error ? cause.message : "上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void upload(file);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={isUploading}
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!isUploading) inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isUploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={clsx(
          "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-5 text-center transition duration-150",
          isUploading
            ? "cursor-wait border-white/10 bg-white/2"
            : "cursor-pointer border-white/15 bg-white/3 hover:border-brand-400/60 hover:bg-brand-500/10",
          isDragging && "border-brand-400 bg-brand-500/15 shadow-[0_0_24px_-6px_var(--color-brand-500)]",
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="size-5 animate-spin text-brand-400" />
            <span className="text-xs text-ink-300">解析并向量化中…</span>
          </>
        ) : (
          <>
            <UploadCloud className="size-5 text-brand-400" />
            <span className="text-xs font-medium text-ink-200">
              {isDragging ? "松手即可上传" : "拖拽文件到此处，或点击选择"}
            </span>
            <span className="text-[11px] text-ink-500">支持 PDF、Markdown · 最大 4MB</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.md,.markdown"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
        />
      </div>

      {error && <p className="text-xs text-accent-red">{error}</p>}
    </div>
  );
}
