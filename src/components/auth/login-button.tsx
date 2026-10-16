"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

/** GitHub 官方 mark，内联避免依赖图标库的品牌图标（部分版本已移除） */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function LoginButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        window.location.href = "/api/auth/github";
      }}
      className="group flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl gradient-brand px-4 py-3 text-sm font-medium text-ink-950 shadow-[0_10px_30px_-10px_var(--color-brand-500)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-12px_var(--color-brand-500)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <GithubMark className="size-4 transition-transform duration-200 group-hover:scale-110" />
      )}
      {pending ? "正在跳转 GitHub…" : "使用 GitHub 继续"}
    </button>
  );
}
