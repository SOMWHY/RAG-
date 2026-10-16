/**
 * 模型与向量维度的**唯一来源**。
 *
 * `src/db/schema.ts` 与 `src/lib/ai.ts` 都必须从这里取值：pgvector 的列维度是写死的，
 * 一旦换了 embedding 模型却没同步维度，入库会直接报维度不匹配。
 *
 * ⚠️ 维度限制：pgvector 0.8.6 的 HNSW / IVFFlat 索引上限为 2000 维。
 * 当前网关唯一可用的 embedding 模型 `nemotron-3-embed-1b` 输出 2048 维，
 * 超过上限，因此 schema 中**不建向量索引**，检索走精确扫描（数据量小时完全够用）。
 * 若换成 ≤2000 维的模型（如 OpenAI `text-embedding-3-small` 的 1536 维），
 * 可恢复 HNSW 索引，详见 README「向量索引」一节。
 */
export const EMBEDDING_DIMENSIONS = 2048;

export const DEFAULT_EMBEDDING_MODEL = "nemotron-3-embed-1b";

export const DEFAULT_CHAT_MODEL = "gpt-5.5";
