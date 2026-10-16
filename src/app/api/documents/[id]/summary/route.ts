import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chunks, documents } from "@/db/schema";
import { requireSession } from "@/lib/auth/session-server";
import { generateStructured } from "@/lib/structured-output";
import { summarySchema } from "@/lib/schema/summary";

export const runtime = "nodejs";
export const maxDuration = 120;

/** 摘要只取前若干片段，控制上下文长度 */
const CONTEXT_CHUNKS = 24;

type RouteContext = { params: Promise<{ id: string }> };

/** 调用前必须已确认该文档属于当前用户（本文件的两个调用点都在归属校验之后） */
async function loadContext(documentId: string) {
  const rows = await db
    .select({ content: chunks.content, pageNumber: chunks.pageNumber })
    .from(chunks)
    .where(eq(chunks.documentId, documentId))
    .orderBy(asc(chunks.chunkIndex))
    .limit(CONTEXT_CHUNKS);

  return rows
    .map((row, index) => `[来源 ${index + 1}]${row.pageNumber ? ` 第 ${row.pageNumber} 页` : ""}\n${row.content}`)
    .join("\n\n");
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const session = await requireSession();
  if (session instanceof Response) return session;

  try {
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, session.sub)));
    if (!document) return Response.json({ error: "文档不存在" }, { status: 404 });
    return Response.json({ summary: document.summary ?? null });
  } catch (error) {
    console.error("load summary failed", error);
    return Response.json({ error: "读取摘要失败" }, { status: 500 });
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const session = await requireSession();
  if (session instanceof Response) return session;

  try {
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, session.sub)));
    if (!document) return Response.json({ error: "文档不存在" }, { status: 404 });
    if (document.status !== "ready") {
      return Response.json({ error: "文档尚未处理完成" }, { status: 409 });
    }

    const context = await loadContext(id);
    if (!context) return Response.json({ error: "文档没有可摘要的内容" }, { status: 400 });

    const object = await generateStructured({
      schema: summarySchema,
      schemaHint:
        '{"title": string, "abstract": string, ' +
        '"keyPoints": [{"point": string, "sourceRef": number 可选}], ' +
        '"keyData": [{"label": string, "value": string}], ' +
        '"conclusions": string[], "tags": string[]}',
      prompt: `你是文档分析助手。请基于以下文档片段输出结构化摘要，全部使用中文。
要求：只依据文档内容，不要补充外部信息；关键数据保留原文数值与单位；
keyPoints 3-6 条，尽量标注 sourceRef（对应上下文里的 [来源 N]）；
keyData 没有则为空数组；conclusions 2-4 条；tags 3-6 个。

文档片段：
${context}`,
    });

    // where 里仍带上 userId 做双保险，避免将来新增调用路径时漏掉归属校验
    await db
      .update(documents)
      .set({ summary: object })
      .where(and(eq(documents.id, id), eq(documents.userId, session.sub)));
    return Response.json(object);
  } catch (error) {
    console.error("generate summary failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "生成摘要失败" },
      { status: 500 },
    );
  }
}
