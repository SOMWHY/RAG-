const TARGET_CHARS = 1800;
const OVERLAP_CHARS = 240;

/** 段落感知切分：优先按段落聚合，超长段落再按窗口滑切 */
export function splitText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > TARGET_CHARS) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let start = 0; start < paragraph.length; start += TARGET_CHARS - OVERLAP_CHARS) {
        chunks.push(paragraph.slice(start, start + TARGET_CHARS).trim());
      }
      continue;
    }
    if (current && current.length + paragraph.length + 2 > TARGET_CHARS) {
      chunks.push(current);
      current = current.slice(-OVERLAP_CHARS) + "\n\n" + paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks.filter((chunk) => chunk.length > 20);
}

export type PageInput = { page: number; text: string };
export type ChunkPiece = { pageNumber: number; content: string };

/**
 * 按页切分：保留页码归属，使来源引用能定位到具体页。
 * chunkIndex 由调用方按最终数组顺序赋值。
 */
export function splitPages(pages: PageInput[]): ChunkPiece[] {
  const pieces: ChunkPiece[] = [];
  for (const { page, text } of pages) {
    for (const content of splitText(text)) {
      pieces.push({ pageNumber: page, content });
    }
  }
  return pieces;
}
