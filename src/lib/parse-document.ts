import mammoth from "mammoth";
import { ensurePdfDomShim, ensurePdfWorker } from "@/lib/pdf-dom-shim";

export type DocumentPage = { page: number; text: string };

export type ParsedDocument = {
  text: string;
  pageCount: number;
  pages: DocumentPage[];
};

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isDocx(file: File): boolean {
  return (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  );
}

async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  // 动态 import 是必需的：shim 必须在 pdf-parse 求值前把 DOMMatrix 挂到 globalThis，
  // 静态 import 的求值顺序在 Turbopack 打包后不保证。
  ensurePdfDomShim();
  await ensurePdfWorker();
  const { PDFParse } = await import("pdf-parse");

  // pdf-parse v2 起改为 PDFParse 类；传入副本避免 Buffer 被 worker 接管
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const pages = result.pages.map((page) => ({ page: page.num, text: page.text }));
    return {
      text: result.text?.trim() || pages.map((page) => page.text).join("\n\n"),
      pageCount: result.total || pages.length,
      pages,
    };
  } finally {
    await parser.destroy();
  }
}

export async function parseDocument(file: File): Promise<ParsedDocument> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isPdf(file)) return parsePdf(buffer);

  if (isDocx(file)) {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    return { text, pageCount: 1, pages: [{ page: 1, text }] };
  }

  const text = buffer.toString("utf8").trim();
  return { text, pageCount: 1, pages: [{ page: 1, text }] };
}
