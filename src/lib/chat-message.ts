import type { UIMessage } from "ai";

/** 检索命中的文档片段，作为来源引用随流下发给前端 */
export type RagSource = {
  id: string;
  documentName: string;
  pageNumber: number | null;
  chunkIndex: number;
  /** 余弦相似度，0~1，越大越相关 */
  score: number;
};

/** 挂在 UIMessage 第一个泛型位（METADATA）上的消息元数据 */
export type ChatMetadata = {
  sources?: RagSource[];
};

export type ChatUIMessage = UIMessage<ChatMetadata>;

/**
 * AI SDK v5 的 UIMessage 用 parts 承载内容，不再有 content 字段。
 * 这里把所有 text part 拼接为纯文本。
 */
export function getMessageText(message: Pick<UIMessage, "parts">): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}
