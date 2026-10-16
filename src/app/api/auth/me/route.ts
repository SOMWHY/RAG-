import { getSession } from "@/lib/auth/session-server";

export const runtime = "nodejs";

/** 当前登录用户，供前端顶栏渲染头像与用户名 */
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ user: null }, { status: 401 });

  return Response.json({
    user: {
      id: session.sub,
      login: session.login,
      name: session.name,
      avatarUrl: session.avatarUrl,
    },
  });
}
