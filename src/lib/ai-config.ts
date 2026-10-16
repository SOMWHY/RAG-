/**
 * 模型与向量维度的**唯一来源**。
 *
 * `src/db/schema.ts` 与 `src/lib/ai.ts` 都必须从这里取值：pgvector 的列维度是写死的，
 * 一旦换了 embedding 模型却没同步维度，入库会直接报维度不匹配。
 *
 * ⚠️ 换 embedding 模型的代价：不同模型产出的向量不在同一个向量空间里，已入库的向量
 *   全部失效（哪怕维度恰好相同）。必须重新向量化——`chunks.content` 里原文还在，
 *   可以原地重算，不需要重新上传文件。
 *
 * 维度限制：pgvector 的 HNSW / IVFFlat **索引**上限为 2000 维（列本身可到 16000 维）。
 * 当前 `text-embedding-3-small` 输出 1536 维，在上限内，因此 schema 中建了 HNSW 索引。
 * 若换成更高维模型（如 `text-embedding-3-large` 的 3072 维），必须移除该索引，
 * 检索退化为精确扫描。
 */
export const EMBEDDING_DIMENSIONS = 1536;

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * 实测（ChatAnywhere 免费档，2026-10）：`gpt-5.5`、`gpt-5.4-mini` 返回 503 无结果；
 * `gpt-3.5-turbo` 可用但单次耗时 60s 以上；`gpt-4o-mini` 约 1.5s 且质量足够。
 * 换模型只需改环境变量 AI_CHAT_MODEL，无需改代码。
 */
export const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
