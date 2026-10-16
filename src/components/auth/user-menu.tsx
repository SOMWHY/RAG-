"use client";

import { clsx } from "clsx";
import { LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AuthUser = {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
};

function Avatar({ user }: { user: AuthUser }) {
  const label = user.name ?? user.login;

  if (!user.avatarUrl) {
    return (
      <span className="flex size-6 items-center justify-center rounded-full gradient-brand text-[11px] font-medium text-ink-950">
        {label.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    // 头像是 GitHub 的外链地址，固定用 img 即可，走 next/image 反而要额外配 remotePatterns
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatarUrl}
      alt={label}
      className="size-6 rounded-full object-cover ring-1 ring-brand-400/40"
    />
  );
}

export function UserMenu() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user: AuthUser | null } | null) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  // 点击外部与 Esc 关闭面板
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const logout = async () => {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/login";
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx(
          "flex cursor-pointer items-center gap-2 rounded-full border bg-white/5 p-0.5 pr-2.5 transition duration-200",
          open ? "border-brand-400/50 bg-white/10" : "border-white/10 hover:border-brand-400/40 hover:bg-white/10",
        )}
      >
        {user ? (
          <Avatar user={user} />
        ) : (
          <span className="size-6 rounded-full bg-white/10 skeleton-shimmer" />
        )}
        <span className="hidden max-w-24 truncate text-[11px] text-ink-300 sm:inline">
          {user ? (user.name ?? user.login) : "加载中"}
        </span>
      </button>

      {open && user && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 animate-rise-in rounded-xl border border-white/10 bg-ink-900/95 p-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-xs font-medium text-ink-100">{user.name ?? user.login}</p>
            <p className="truncate text-[11px] text-ink-500">@{user.login}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void logout()}
            disabled={pending}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-accent-red transition hover:bg-accent-red/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="size-3.5" />
            {pending ? "正在退出…" : "退出登录"}
          </button>
        </div>
      )}
    </div>
  );
}
