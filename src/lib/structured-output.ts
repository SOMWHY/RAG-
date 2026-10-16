import { generateText } from "ai";
import { z } from "zod";
import { getChatModel } from "@/lib/ai";

/** 首次生成 + 1 次纠错重试 */
const MAX_ATTEMPTS = 2;

const JSON_ONLY = "只输出 JSON，不要输出任何解释文字，不要使用 markdown 代码块。";

/** 从模型输出里提取 JSON：容忍 ```json 包裹，以及前后多余的说明文字 */
function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start < 0) return null;
  const opener = candidate[start];
  const closer = opener === "[" ? "]" : "}";
  const end = candidate.lastIndexOf(closer);
  if (end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * 生成结构化输出（替代 generateObject）。
 *
 * **为什么不用 generateObject**：AI SDK v7 对它固定使用 `response_format: json_schema`
 * （structured outputs），且 `mode` 参数已失效，无法降级到 function calling。实测当前网关
 * 对**复杂** schema 直接返回 400 `服务暂时不可用`，简单 schema 却正常——这不是我们能控制的。
 *
 * 改为「纯文本生成 + 自行解析校验」后，只依赖最基础的 `/v1/chat/completions`，
 * 任何 OpenAI 兼容网关都能用。
 */
export async function generateStructured<T extends z.ZodType>(options: {
  schema: T;
  /** 用自然语言描述目标 JSON 结构，会拼进提示词 */
  schemaHint: string;
  prompt: string;
}): Promise<z.infer<T>> {
  const { schema, schemaHint, prompt } = options;

  let lastError = "未找到 JSON";
  let lastRaw = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const correction = attempt > 1
      ? `\n\n上一次输出无法解析为合法 JSON（原因：${lastError}）。请严格按结构重新输出，且只输出 JSON。`
      : "";

    const { text } = await generateText({
      model: getChatModel(),
      prompt: `${prompt}\n\n${JSON_ONLY}\n\n输出 JSON 结构：${schemaHint}${correction}`,
    });
    lastRaw = text;

    const parsed = extractJson(text);
    if (parsed === null) {
      lastError = "输出不是合法 JSON";
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) return result.data;

    lastError = result.error.issues[0]?.message ?? "字段不符合要求";
  }

  throw new Error(
    `结构化输出解析失败（已尝试 ${MAX_ATTEMPTS} 次）：${lastError}。原始输出片段：${lastRaw.slice(0, 120)}`,
  );
}
