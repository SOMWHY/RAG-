import { embed } from "ai";
import { and, cosineDistance, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { chunks, documents } from "@/db/schema";
import { getEmbeddingModel } from "@/lib/ai";

/** 低于该余弦相似度的片段视为无关，不进入 LLM 上下文 */
export const MIN_SIMILARITY = 0.2;

export type RetrievedChunk = {
  id: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  documentId: string;
  documentName: string;
  /** 余弦相似度，0~1，越大越相关 */
  score: number;
};

/**
 * 语义检索：问题向量化 → pgvector 余弦相似度 → 取最相关的若干片段。
 *
 * userId 是必填的第三个参数：**漏了它不会报错**，只会导致检索到别人的向量，
 * 答案莫名其妙却查不出原因。chunks 表刻意不加 userId，统一靠 join documents 过滤。
 *
 * documentIds 为空表示不限制文档（检索当前用户全部已就绪文档）；传入时**严格限定**
 * 在这批文档内，命中为空就是空，不回退。归属过滤始终保留，因此即便传入他人的
 * 文档 id 也只会检索不到，不存在越权。
 */
export async function retrieveChunks(
  query: string,
  limit = 6,
  userId: string,
  documentIds?: string[],
): Promise<RetrievedChunk[]> {
  const { embedding } = await embed({ model: getEmbeddingModel(), value: query });

  const distance = cosineDistance(chunks.embedding, embedding);
  const similarity = sql<number>`1 - (${distance})`;

  const rows = await db
    .select({
      id: chunks.id,
      content: chunks.content,
      chunkIndex: chunks.chunkIndex,
      pageNumber: chunks.pageNumber,
      documentId: documents.id,
      documentName: documents.name,
      similarity,
    })
    .from(chunks)
    .innerJoin(documents, eq(chunks.documentId, documents.id))
    .where(
      and(
        sql`${chunks.embedding} is not null`,
        eq(documents.status, "ready"),
        eq(documents.userId, userId),
        documentIds?.length ? inArray(documents.id, documentIds) : undefined,
        gt(similarity, MIN_SIMILARITY),
      ),
    )
    .orderBy(sql`${similarity} desc`)
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    chunkIndex: row.chunkIndex,
    pageNumber: row.pageNumber,
    documentId: row.documentId,
    documentName: row.documentName,
    score: Number(row.similarity.toFixed(4)),
  }));
}
