/**
 * pdfjs-dist 没有为 worker 构建产物提供类型。
 * 我们 import 它只是为了触发其副作用（写入 globalThis.pdfjsWorker），不使用其导出。
 */
declare module "pdfjs-dist/legacy/build/pdf.worker.min.mjs";
