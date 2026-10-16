import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 明确 Turbopack 工作区根目录，避免它向上查找 package-lock.json 时越过仓库边界
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  // 文档上传走 Route Handler（app/api/documents），不走 Server Action，
  // 因此不再依赖 experimental.serverActions.bodySizeLimit

  // pdf-parse 交给 Node 原生加载，避免它被打包后内部路径解析异常。
  //
  // pdfjs-dist **不能**放进这个列表：worker 文件（pdf.worker.min.mjs）需要被打进 bundle
  // 才会进产物。若外部化，它会退化成运行时从 node_modules 读取，而该动态 import 路径
  // 打包器无法静态解析，文件不会被追踪，于是报
  // "Setting up fake worker failed: Cannot find module ... pdf.worker.mjs"。
  // 详见 src/lib/pdf-dom-shim.ts 的 ensurePdfWorker
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
