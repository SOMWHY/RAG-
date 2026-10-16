import { getChatModelId, getEmbeddingModelId } from "@/lib/ai";
import { EMBEDDING_DIMENSIONS } from "@/lib/ai-config";

export const runtime = "nodejs";

/** 供前端展示当前生效的模型与向量维度，不返回任何密钥 */
export async function GET() {
  return Response.json({
    chatModel: getChatModelId(),
    embeddingModel: getEmbeddingModelId(),
    embeddingDimensions: EMBEDDING_DIMENSIONS,
  });
}
