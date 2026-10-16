import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chunks, documentStats, documents } from "@/db/schema";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** 文档详情：元信息 + 全部片段，供详情面板溯源浏览 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
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
