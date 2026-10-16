import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import { getChatModel } from "@/lib/ai";
import { requireSession } from "@/lib/auth/session-server";
import { getMessageText, type ChatUIMessage, type RagSource } from "@/lib/chat-message";
import { retrieveChunks } from "@/lib/search";

export const runtime = "nodejs";
export const maxDuration = 60;

function buildContext(sources: RagSource[], contents: string[]): string {
  if (!sources.length) return "没有检索到相关内容。";
  return sources
    .map((source, index) => {
      const location = source.pageNumber ? `${source.documentName} · 第 ${source.pageNumber} 页` : source.documentName;
      return `[来源 ${index + 1}] ${location}\n${contents[index]}`;
    })
    .join("\n\n");
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof Response) return session;

  try {
    const body = (await request.json()) as { messages?: ChatUIMessage[] };
    const messages = body.messages ?? [];

    const latestUser = [...messages].reverse().find((message) => message.role === "user");
    const query = latestUser ? getMessageText(latestUser) : "";
    if (!query) return Response.json({ error: "请输入问题" }, { status: 400 });

    // 检索只在当前用户的文档范围内进行
    const hits = await retrieveChunks(query, 6, session.sub);
    const sources: RagSource[] = hits.map((hit) => ({
      id: hit.id,
      documentName: hit.documentName,
      pageNumber: hit.pageNumber,
      chunkIndex: hit.chunkIndex,
      score: hit.score,
    }));

    const result = streamText({
      model: getChatModel(),
      instructions: `你是一个严谨的文档知识助手。只根据提供的文档上下文回答；如果上下文不足以支撑结论，明确说明"文档中未提及"，不要臆造。
引用事实时，在句末使用 [来源 N] 标注，N 对应下文中 [来源 N] 的编号；同一句话可引用多个来源。

文档上下文：
${buildContext(sources, hits.map((hit) => hit.content))}`,
      // convertToModelMessages 返回 Promise，必须 await；v5 中 UIMessage 不能直接喂给 streamText
      messages: await convertToModelMessages(messages),
    });

    // 来源随流下发，客户端通过 message.metadata.sources 读取，无需二次请求
    const stream = toUIMessageStream({
      stream: result.stream,
      messageMetadata: ({ part }) => {
        if (part.type === "start" || part.type === "finish") return { sources };
        return undefined;
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("chat failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "问答失败" },
      { status: 500 },
    );
  }
}
