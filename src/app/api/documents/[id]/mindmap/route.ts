import { generateObject } from "ai";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chunks, documents } from "@/db/schema";
import { getChatModel } from "@/lib/ai";
import { mindmapSchema } from "@/lib/schema/mindmap";

export const runtime = "nodejs";
export const maxDuration = 120;

const CONTEXT_CHUNKS = 24;

type RouteContext = { params: Promise<{ id: string }> };

async function loadContext(documentId: string) {
  const rows = await db
    .select({ content: chunks.content })
    .from(chunks)
    .where(eq(chunks.documentId, documentId))
    .orderBy(asc(chunks.chunkIndex))
    .limit(CONTEXT_CHUNKS);
  return rows.map((row, index) => `[片段 ${index + 1}]\n${row.content}`).join("\n\n");
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    if (!document) return Response.json({ error: "文档不存在" }, { status: 404 });
    return Response.json({ mindmap: document.mindmap ?? null });
  } catch (error) {
    console.error("load mindmap failed", error);
    return Response.json({ error: "读取思维导图失败" }, { status: 500 });
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    if (!document) return Response.json({ error: "文档不存在" }, { status: 404 });
    if (document.status !== "ready") {
      return Response.json({ error: "文档尚未处理完成" }, { status: 409 });
    }

    const context = await loadContext(id);
    if (!context) return Response.json({ error: "文档没有可生成导图的内容" }, { status: 400 });

    const { object } = await generateObject({
      model: getChatModel(),
      schema: mindmapSchema,
      prompt: `你是知识结构化助手。请把下面的文档片段组织成思维导图，全部使用中文。
要求：有且仅有一个根节点（parentId 为 null），根节点是文档主题；第二层为主要章节，第三层为要点；
节点数控制在 10-18 个；label 不超过 16 个字；id 使用简短英文且全局唯一。

文档片段：
${context}`,
    });

    await db.update(documents).set({ mindmap: object }).where(eq(documents.id, id));
    return Response.json(object);
  } catch (error) {
    console.error("generate mindmap failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "生成思维导图失败" },
      { status: 500 },
    );
  }
}
