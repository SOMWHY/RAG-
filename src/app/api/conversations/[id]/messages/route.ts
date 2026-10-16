import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversationMessages, conversations } from "@/db/schema";
import { requireSession } from "@/lib/auth/session-server";
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

/**
 * 会话归属校验。消息表本身没有 userId，若不先校验会话归属，
 * 任何人拿着 conversationId 就能读写别人的聊天记录。
 */
async function isOwnedConversation(id: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  return Boolean(row);
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const session = await requireSession();
  if (session instanceof Response) return session;

  try {
    /*
     * 归属校验与取消息之间没有依赖，并发发出，省掉一次数据库往返。
     * 没有合并成 innerJoin：那样「会话存在但没消息」和「会话不属于你」
     * 都会得到空结果，就无法再对越权返回 404 了。
     * 未通过校验时 rows 直接丢弃，不会泄露给请求方。
     */
    const [owned, rows] = await Promise.all([
      isOwnedConversation(id, session.sub),
      db
        .select({
          id: conversationMessages.id,
          role: conversationMessages.role,
          parts: conversationMessages.parts,
          metadata: conversationMessages.metadata,
        })
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, id))
        .orderBy(asc(conversationMessages.createdAt), asc(conversationMessages.id)),
    ]);

    if (!owned) return Response.json({ error: "会话不存在" }, { status: 404 });

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

  const session = await requireSession();
  if (session instanceof Response) return session;
  if (!(await isOwnedConversation(id, session.sub))) {
    return Response.json({ error: "会话不存在" }, { status: 404 });
  }

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
