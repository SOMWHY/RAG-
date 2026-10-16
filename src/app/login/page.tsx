import { Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/auth/login-button";
import { getSession } from "@/lib/auth/session-server";

const ERROR_MESSAGES: Record<string, string> = {
  config: "服务端缺少 GitHub OAuth 配置（AUTH_GITHUB_ID / AUTH_GITHUB_SECRET）",
  state: "登录校验失败，请重新登录",
  code: "未取得 GitHub 授权码，请重新登录",
  oauth: "GitHub 登录失败，请稍后重试",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/");

  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "登录失败，请重试") : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-rise-in">
        <div className="glass-panel rounded-2xl p-7">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl gradient-brand shadow-[0_0_28px_-8px_var(--color-brand-500)]">
              <Sparkles className="size-5 text-white" />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-ink-100">RAG 知识助手</h1>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
              使用 GitHub 账号登录，你的文档与对话仅你自己可见
            </p>
          </div>

          {message && (
            <p className="mt-5 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-[11px] leading-relaxed text-accent-red">
              {message}
            </p>
          )}

          <div className="mt-6">
            <LoginButton />
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-500">
          只会读取你的 GitHub 昵称与头像，不会获取仓库权限
        </p>
      </div>
    </main>
  );
}
