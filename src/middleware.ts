import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

/** 无需登录即可访问的路径 */
const PUBLIC_PATHS = ["/login"];
const PUBLIC_PREFIXES = ["/api/auth"];

/**
 * 全站登录保护。
 *
 * 只做「有没有会话」的粗筛 —— 具体数据归属由各 Route Handler 再校验一次，
 * 因为 middleware 跑在 Edge Runtime，连不了数据库。
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(request);
  if (session) return NextResponse.next();

  // API 必须返回 401 而不是重定向，否则前端拿到的是登录页 HTML，识别不出「未登录」
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
