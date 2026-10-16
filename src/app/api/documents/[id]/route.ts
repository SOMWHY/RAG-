import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chunks, documentStats, documents } from "@/db/schema";
import { requireSession } from "@/lib/auth/session-server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** 文档详情：元信息 + 全部片段，供详情面板溯源浏览 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const session = await requireSession();
  if (session instanceof Response) return session;

  try {
    // 越权一律返回 404，不泄露资源是否存在
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, session.sub)));
    if (!document) return Response.json({ error: "文档不存在" }, { status: 404 });

    const rows = await db
      .select({
        id: chunks.id,
        content: chunks.content,
        chunkIndex: chunks.chunkIndex,
        pageNumber: chunks.pageNumber,
        tokenCount: chunks.tokenCount,
      })
      .from(chunks)
      .where(eq(chunks.documentId, id))
      .orderBy(asc(chunks.chunkIndex));

    const [stats] = await db
      .select({ chunkCount: documentStats.chunkCount })
      .from(documentStats)
      .where(eq(documentStats.documentId, id));

    return Response.json({
      document: {
        ...document,
        hasSummary: Boolean(document.summary),
        hasMindmap: Boolean(document.mindmap),
        chunkCount: stats?.chunkCount ?? rows.length,
      },
      chunks: rows,
    });
  } catch (error) {
    console.error("load document detail failed", error);
    return Response.json({ error: "读取文档详情失败" }, { status: 500 });
  }
}

/**
 * 删除文档。chunks 与 document_stats 都配了 onDelete cascade，
 * 删掉 documents 一行即可，片段与统计由数据库级联清除。
 *
 * 不可恢复：原文没有留备份，删除后只能重新上传并重新向量化。
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const session = await requireSession();
  if (session instanceof Response) return session;

  try {
    // 越权与不存在都返回 404：不泄露某个 id 是否真实存在
    const deleted = await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, session.sub)))
      .returning({ id: documents.id });

    if (!deleted.length) return Response.json({ error: "文档不存在" }, { status: 404 });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("delete document failed", error);
    return Response.json({ error: "删除文档失败" }, { status: 500 });
  }
}
