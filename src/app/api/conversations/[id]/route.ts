import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { requireSession } from "@/lib/auth/session-server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const session = await requireSession();
  if (session instanceof Response) return session;

  try {
    // 只能删自己的会话；删不到就当不存在，不泄露他人资源
    const deleted = await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, session.sub)))
      .returning({ id: conversations.id });

    if (!deleted.length) return Response.json({ error: "会话不存在" }, { status: 404 });
    return Response.json({ id });
  } catch (error) {
    console.error("delete conversation failed", error);
    return Response.json({ error: "删除会话失败" }, { status: 500 });
  }
}
