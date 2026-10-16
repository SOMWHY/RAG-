import { NextResponse } from "next/server";
import { buildAuthorizeUrl, createState } from "@/lib/auth/github";

export const runtime = "nodejs";

/** 生成 state 并跳转到 GitHub 授权页 */
export async function GET(request: Request) {
  try {
    return NextResponse.redirect(buildAuthorizeUrl(request, await createState()));
  } catch (error) {
    console.error("build github authorize url failed", error);
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=config`);
  }
}
