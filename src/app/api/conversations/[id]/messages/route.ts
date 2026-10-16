import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversationMessages, conversations } from "@/db/schema";
import type { ChatUIMessage } from "@/lib/chat-message";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

type IncomingMessage = {
  role?: unknown;
  parts?: unknown;
  metadata?: unknown;
};

const ROLES = new Set(["system", "user", "assistant"]);

function normalize(message: IncomingMessage) {
  if (typeof message.role !== "string" || !ROLES.has(message.role)) return null;
  if (!Array.isArray(message.parts)) return null;
  return {
    role: message.role as ChatUIMessage["role"],
    parts: message.parts as ChatUIMessage["parts"],
    metadata: (message.metadata ?? null) as ChatUIMessage["metadata"] | null,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const rows = await db
      .select({
        id: conversationMessages.id,
        role: conversationMessages.role,
        parts: conversationMessages.parts,
        metadata: conversationMessages.metadata,
      })
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, id))
      .orderBy(asc(conversationMessages.createdAt), asc(conversationMessages.id));

    return Response.json(
      rows.map((row) => ({
        id: row.id,
        role: row.role,
        parts: row.parts,
        metadata: row.metadata,
      })) as ChatUIMessage[],
    );
  } catch (error) {
    console.error("list messages failed", error);
    return Response.json({ error: "获取会话消息失败" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as {
      messages?: IncomingMessage[];
      title?: string;
    };

    const normalized = (body.messages ?? []).map(normalize).filter((item) => item !== null);
    if (!normalized.length) {
      return Response.json({ error: "没有可保存的消息" }, { status: 400 });
    }

    await db.insert(conversationMessages).values(
      normalized.map((message) => ({
        conversationId: id,
        role: message.role,
        parts: message.parts,
        metadata: message.metadata,
      })),
    );

    const patch: { updatedAt: Date; title?: string } = { updatedAt: new Date() };
    if (body.title?.trim()) patch.title = body.title.trim().slice(0, 60);
    await db.update(conversations).set(patch).where(eq(conversations.id, id));

    return Response.json({ saved: normalized.length });
  } catch (error) {
    console.error("append messages failed", error);
    return Response.json({ error: "保存会话消息失败" }, { status: 500 });
  }
}
