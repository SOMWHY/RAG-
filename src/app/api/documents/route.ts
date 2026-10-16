import { embedMany } from "ai";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { chunks, documentStats, documents } from "@/db/schema";
import { getEmbeddingModel } from "@/lib/ai";
import { splitPages } from "@/lib/chunker";
import { parseDocument } from "@/lib/parse-document";

export const runtime = "nodejs";
export const maxDuration = 300;

// Vercel 请求体硬上限为 4.5MB，超过会在平台层返回 413，请求根本到不了本函数
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".md", ".markdown"];
/** 分批入库：Postgres 单条语句的参数上限为 65535，避免超长文档一次性插入时触顶 */
const INGEST_BATCH_SIZE = 32;

function estimateTokenCount(content: string): number {
  return Math.ceil(content.length / 3);
}

export async function GET() {
  try {
    const rows = await db
      .select({
        id: documents.id,
        name: documents.name,
        mimeType: documents.mimeType,
        size: documents.size,
        status: documents.status,
        pageCount: documents.pageCount,
        createdAt: documents.createdAt,
        chunkCount: documentStats.chunkCount,
        hasSummary: sql<boolean>`${documents.summary} is not null`,
        hasMindmap: sql<boolean>`${documents.mindmap} is not null`,
      })
      .from(documents)
      .leftJoin(documentStats, eq(documentStats.documentId, documents.id))
      .orderBy(desc(documents.createdAt));

    return Response.json(
      rows.map((row) => ({
        ...row,
        chunkCount: row.chunkCount ?? 0,
        hasSummary: Boolean(row.hasSummary),
        hasMindmap: Boolean(row.hasMindmap),
      })),
    );
  } catch (error) {
    console.error("list documents failed", error);
    return Response.json({ error: "获取文档列表失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "请选择文件" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "文件不能超过 4MB" }, { status: 400 });
  }
  const lowerName = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return Response.json({ error: "目前仅支持 PDF 和 Markdown" }, { status: 400 });
  }

  let documentId: string | null = null;

  try {
    const parsed = await parseDocument(file);
    const pieces = splitPages(parsed.pages);
    if (!pieces.length) {
      return Response.json({ error: "文档没有可索引的文本内容" }, { status: 400 });
    }

    const [document] = await db
      .insert(documents)
      .values({
        name: file.name,
        mimeType: file.type || "text/markdown",
        size: file.size,
        status: "processing",
        pageCount: parsed.pageCount,
      })
      .returning();
    documentId = document.id;

    for (let start = 0; start < pieces.length; start += INGEST_BATCH_SIZE) {
      const batch = pieces.slice(start, start + INGEST_BATCH_SIZE);
      const { embeddings } = await embedMany({
        model: getEmbeddingModel(),
        values: batch.map((piece) => piece.content),
        maxParallelCalls: 2,
      });
      await db.insert(chunks).values(
        batch.map((piece, index) => ({
          documentId: document.id,
          content: piece.content,
          chunkIndex: start + index,
          pageNumber: piece.pageNumber,
          tokenCount: estimateTokenCount(piece.content),
          embedding: embeddings[index],
        })),
      );
    }

    await db
      .update(documents)
      .set({ status: "ready" })
      .where(eq(documents.id, document.id));

    await db
      .insert(documentStats)
      .values({ documentId: document.id, chunkCount: pieces.length })
      .onConflictDoUpdate({
        target: documentStats.documentId,
        set: { chunkCount: pieces.length, updatedAt: new Date() },
      });

    return Response.json({ ...document, status: "ready", chunkCount: pieces.length });
  } catch (error) {
    console.error("document ingestion failed", error);
    // 失败必须回写状态，否则文档会永久停留在「处理中」
    if (documentId) {
      await db
        .update(documents)
        .set({ status: "failed" })
        .where(eq(documents.id, documentId))
        .catch((cause) => console.error("mark document failed", cause));
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "文档处理失败" },
      { status: 500 },
    );
  }
}
