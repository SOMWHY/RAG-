/**
 * pdfjs-dist 在模块顶层执行 `new DOMMatrix()`，它期望从 @napi-rs/canvas 取到实现。
 * 在 serverless 环境下该原生模块常常没被打进产物，require 失败时 pdfjs 只 warn 不抛错，
 * 于是在 `new DOMMatrix()` 处直接抛 ReferenceError，导致加载 pdf-parse 就失败。
 *
 * 本项目只用 getText() 做文本提取，不渲染，因此最小实现即可：
 * DOMMatrix 的矩阵运算仅用于渲染路径（pdf.mjs 的 mirrorContextOperations）。
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
