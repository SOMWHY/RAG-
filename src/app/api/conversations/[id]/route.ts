import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations } from "@/db/schema";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await db.delete(conversations).where(eq(conversations.id, id));
    return Response.json({ id });
  } catch (error) {
    console.error("delete conversation failed", error);
    return Response.json({ error: "删除会话失败" }, { status: 500 });
  }
}
