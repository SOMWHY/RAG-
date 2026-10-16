import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { EMBEDDING_DIMENSIONS } from "@/lib/ai-config";
import type { Mindmap } from "@/lib/schema/mindmap";
import type { DocumentSummary } from "@/lib/schema/summary";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    status: text("status").notNull().default("processing"),
    /** PDF 页数；Markdown 等纯文本为 1 */
    pageCount: integer("page_count"),
    summary: jsonb("summary").$type<DocumentSummary | null>(),
    mindmap: jsonb("mindmap").$type<Mindmap | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("documents_created_at_idx").on(table.createdAt)],
);

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    pageNumber: integer("page_number"),
    tokenCount: integer("token_count"),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  // 未建向量索引：pgvector 的 HNSW / IVFFlat 上限为 2000 维，
  // 而当前 embedding 模型输出 2048 维。检索走精确扫描。
  // 若换成 ≤2000 维的模型，可加回：
  //   index("chunks_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops"))
  (table) => [index("chunks_document_id_idx").on(table.documentId)],
);

export const documentStats = pgTable("document_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" })
    .unique(),
  chunkCount: integer("chunk_count").notNull(),
  avgDistance: real("avg_distance"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull().default("新对话"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("conversations_updated_at_idx").on(table.updatedAt)],
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    /** UIMessage.parts 原样持久化，回读后可直接喂给 useChat */
    parts: jsonb("parts").notNull(),
    /** UIMessage.metadata，承载来源引用 */
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("conversation_messages_conversation_idx").on(table.conversationId)],
);
