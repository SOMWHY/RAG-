import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  exchangeCodeForToken,
  fetchGithubProfile,
  getRedirectUri,
  getReturnBase,
  verifyState,
} from "@/lib/auth/github";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/auth/session";

export const runtime = "nodejs";

/** GitHub 回调：校验 state → 换 token → 读资料 → upsert 用户 → 签发会话 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  // 回跳域名必须和签发 Cookie 的域名一致，否则会话带不回去
  const origin = getReturnBase(request);

  const code = params.get("code");
  const state = params.get("state");

  if (!(await verifyState(state))) {
    return NextResponse.redirect(`${origin}/login?error=state`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=code`);
  }

  try {
    const accessToken = await exchangeCodeForToken(code, getRedirectUri(request));
    const profile = await fetchGithubProfile(accessToken);

    // 同一 GitHub 账号重复登录时刷新昵称与头像，避免改名后显示旧值
    const [user] = await db
      .insert(users)
      .values({
        githubId: profile.githubId,
        login: profile.login,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      })
      .onConflictDoUpdate({
        target: users.githubId,
        set: { login: profile.login, name: profile.name, avatarUrl: profile.avatarUrl },
      })
      .returning();

    const jwt = await signSession({
      sub: user.id,
      login: user.login,
      name: user.name,
      avatarUrl: user.avatarUrl,
    });

    const response = NextResponse.redirect(`${origin}/`);
    response.cookies.set(SESSION_COOKIE, jwt, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error("github oauth callback failed", error);
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
}
