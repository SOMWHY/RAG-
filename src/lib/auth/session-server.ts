import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/auth/session";

/**
 * 服务端会话读取。依赖 next/headers，**只能在 Route Handler / Server Component 里调用**；
 * middleware 请用 session.ts 的 getSessionFromRequest()。
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * 读取当前会话；未登录直接返回 401 Response。
 *
 * 用法：
 * ```ts
 * const session = await requireSession();
 * if (session instanceof Response) return session;
 * // 此后 session 即为 SessionPayload
 * ```
 */
export async function requireSession(): Promise<SessionPayload | Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "未登录" }, { status: 401 });
  return session;
}
