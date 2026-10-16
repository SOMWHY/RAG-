/**
 * 让 pdfjs-dist 能在 Node / serverless 下工作。它有两处对运行环境的隐式依赖：
 *
 * 1. `new DOMMatrix()`：pdfjs 期望从 @napi-rs/canvas 取实现，而该原生模块在 serverless
 *    下常常没被打进产物，require 失败时 pdfjs 只 warn 不抛错，于是在模块顶层直接抛
 *    ReferenceError。本项目只用 getText() 做文本提取，不渲染，最小实现即可。
 *
 * 2. worker：pdfjs 在 Node 下会 `import(workerSrc)` 把 worker 当普通模块加载（fake worker）。
 *    这个路径是运行时拼出来的，打包器无法静态解析，文件因此不进产物。解决办法是自己
 *    import 一次 worker —— 它会在末尾写入 globalThis.pdfjsWorker，pdfjs 检测到后就
 *    不再做那次动态 import。
 */
// 用宽松类型写入：TS 的 DOM 库已声明了完整 DOMMatrix/Path2D/ImageData，
// 最小实现无法满足其类型，这里只需要保证运行时存在即可。
type Globals = Record<string, unknown>;

let applied = false;

/** 必须在 import("pdf-parse") 之前调用 */
export function ensurePdfDomShim(): void {
  if (applied) return;
  applied = true;

  const globals = globalThis as unknown as Globals;

  if (!globals.DOMMatrix) {
    globals.DOMMatrix = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;

      constructor(init?: number[]) {
        if (init?.length === 6) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init;
        }
      }

      translate() {
        return this;
      }

      scale() {
        return this;
      }

      invertSelf() {
        return this;
      }

      multiplySelf() {
        return this;
      }

      preMultiplySelf() {
        return this;
      }
    };
  }

  if (!globals.Path2D) {
    globals.Path2D = class Path2D {
      addPath() {}
    };
  }

  if (!globals.ImageData) {
    globals.ImageData = class ImageData {};
  }
}

let workerLoaded: Promise<void> | null = null;

/**
 * 预加载 pdfjs worker。必须在 import("pdf-parse") 之前完成：
 * worker 模块被 import 时会自行写入 globalThis.pdfjsWorker，pdfjs 检测到后
 * 就会跳过它那次 `import(workerSrc)`（该路径在 serverless 产物里不存在）。
 *
 * 注意：pdfjs-dist **不能**放进 serverExternalPackages，否则这里的 import
 * 会退化成运行时从 node_modules 读取，一样找不到文件。
 */
export function ensurePdfWorker(): Promise<void> {
  workerLoaded ??= import("pdfjs-dist/legacy/build/pdf.worker.min.mjs")
    .then(() => undefined)
    .catch((cause: unknown) => {
      // 不阻断：失败时 pdfjs 仍会尝试自己的加载路径，交由它抛出原始错误
      console.warn(
        "pdf worker 预加载失败：",
        cause instanceof Error ? cause.message : String(cause),
      );
    });
  return workerLoaded;
}
