import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_CHAT_MODEL, DEFAULT_EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "@/lib/ai-config";

export { DEFAULT_CHAT_MODEL, DEFAULT_EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };

export function getChatModelId(): string {
  return process.env.AI_CHAT_MODEL ?? DEFAULT_CHAT_MODEL;
}

export function getEmbeddingModelId(): string {
  return process.env.AI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
}

/**
 * 默认走 OpenAI 兼容网关。建议在 .env.local 中显式设置 AI_BASE_URL，
 * 以便切换 OpenAI 官方 / 自建网关 / AI Gateway。
 */
const DEFAULT_BASE_URL = "https://yujianwudi.top/v1";

/** 校验 baseURL：把 API Key 误填进 AI_BASE_URL 时，这里会给出可诊断的错误而非 "Failed to parse URL" */
function getBaseURL(): string {
  const raw = (process.env.AI_BASE_URL ?? DEFAULT_BASE_URL).trim();
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `AI_BASE_URL 不是合法 URL（当前值：${raw.slice(0, 16)}…）。` +
        `应形如 https://api.openai.com/v1，注意不要填成 API Key`,
    );
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`AI_BASE_URL 协议必须是 http 或 https，当前为 ${parsed.protocol}`);
  }
  return parsed.toString().replace(/\/+$/, "");
}

function getProvider() {
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("缺少 AI_API_KEY 或 OPENAI_API_KEY 环境变量");
  return createOpenAI({ apiKey, baseURL: getBaseURL() });
}

export function getChatModel() {
  // 必须用 .chat()：直接调用 provider(modelId) 会走 /v1/responses（Responses API），
  // 而多数 OpenAI 兼容网关只实现 /v1/chat/completions，会报 "No available channel"。
  // 若改用 OpenAI 官方并想用 Responses API，换成 getProvider().responses(getChatModelId())。
  return getProvider().chat(getChatModelId());
}

export function getEmbeddingModel() {
  return getProvider().embedding(getEmbeddingModelId());
}
