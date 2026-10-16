import { z } from "zod";

export type MindmapNode = {
  id: string;
  label: string;
  weight?: number;
  children: MindmapNode[];
};

/**
 * 用扁平的「节点 + parentId」结构交给模型生成，避免递归 schema 在
 * JSON Schema 转换时产生 $ref/$defs 递归引用（部分模型对递归结构支持不佳）。
 * 前端再用 buildMindmapTree 还原成树。
 */
export const mindmapSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string().describe("节点 id，简短英文，全局唯一"),
        label: z.string().describe("节点显示文本，不超过 16 个字"),
        parentId: z
          .string()
          .nullable()
          .describe("父节点 id；根节点为 null，全文只能有一个根节点"),
        weight: z.number().int().min(1).max(5).optional().describe("重要程度 1-5"),
      }),
    )
    .describe("10-18 个节点，组织为 3 层：主题 → 章节 → 要点"),
});

export type Mindmap = z.infer<typeof mindmapSchema>;

/** 扁平节点还原为树；丢弃无法挂载到根上的孤立节点 */
export function buildMindmapTree(mindmap: Mindmap): MindmapNode | null {
  const nodes = new Map<string, MindmapNode>();
  for (const item of mindmap.nodes) {
    nodes.set(item.id, { id: item.id, label: item.label, weight: item.weight, children: [] });
  }

  let root: MindmapNode | null = null;
  for (const item of mindmap.nodes) {
    const node = nodes.get(item.id);
    if (!node) continue;
    if (!item.parentId) {
      if (!root) root = node;
      continue;
    }
    const parent = nodes.get(item.parentId);
    if (parent) parent.children.push(node);
  }

  return root;
}
