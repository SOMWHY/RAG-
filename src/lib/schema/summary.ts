import { z } from "zod";

/** 结构化摘要：核心观点 / 关键数据 / 结论 */
export const summarySchema = z.object({
  title: z.string().describe("文档标题，或一句话概括的主题"),
  abstract: z.string().describe("150 字以内的整体概述"),
  keyPoints: z
    .array(
      z.object({
        point: z.string().describe("一条核心观点，一句话表述"),
        sourceRef: z
          .number()
          .int()
          .optional()
          .describe("该观点对应的来源编号，对应上下文中的 [来源 N]"),
      }),
    )
    .describe("3-6 条核心观点"),
  keyData: z
    .array(
      z.object({
        label: z.string().describe("数据项名称"),
        value: z.string().describe("数据值，保留原文单位与量级"),
      }),
    )
    .describe("文中出现的关键数据，没有则为空数组"),
  conclusions: z.array(z.string()).describe("2-4 条结论或行动建议"),
  tags: z.array(z.string()).describe("3-6 个主题标签"),
});

export type DocumentSummary = z.infer<typeof summarySchema>;
