import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 明确 Turbopack 工作区根目录，避免它向上查找 package-lock.json 时越过仓库边界
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  // 文档上传走 Route Handler（app/api/documents），不走 Server Action，
  // 因此不再依赖 experimental.serverActions.bodySizeLimit

  // pdf-parse v2 依赖 pdfjs-dist，它会按打包产物相对路径去 import "pdf.worker.mjs"。
  // 一旦被打包进 server chunk 就找不到该 worker，报 "Setting up fake worker failed"。
  // 交给 Node 原生 require 即可从 node_modules 正常解析。
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
