import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG 知识助手 · 文档问答与知识管理",
  description:
    "基于 RAG（检索增强生成）的文档问答应用：上传 PDF / Markdown，自动切分向量化，流式回答并附来源引用。",
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
