import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { requireSession } from "@/lib/auth/session-server";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (session instanceof Response) return session;

  try {
    const rows = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.userId, session.sub))
      .orderBy(desc(conversations.updatedAt))
      .limit(50);
    return Response.json(rows);
  } catch (error) {
    console.error("list conversations failed", error);
    return Response.json({ error: "获取会话列表失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof Response) return session;

  try {
    const body = (await request.json().catch(() => ({}))) as { title?: string };
    const [conversation] = await db
      .insert(conversations)
      .values({
        userId: session.sub,
        title: body.title?.trim().slice(0, 60) || "新对话",
      })
      .returning();
    return Response.json(conversation);
  } catch (error) {
    console.error("create conversation failed", error);
    return Response.json({ error: "创建会话失败" }, { status: 500 });
  }
}
