你是一个全栈 AI 应用开发助手。我要做一个用于前端求职的作品集项目：一个**文档 RAG 知识管理助手**。请你先阅读以下项目概述，然后**向我提出澄清问题**，等我回答后，再进入计划模式（plan mode），制定详细的开发计划。

## 一、项目是干嘛的

这是一个基于 RAG（检索增强生成）的文档问答与知识管理应用。用户可以上传 PDF 或 Markdown 文档，系统自动解析、切分、向量化并存储。之后用户可以用自然语言提问，AI 会基于文档内容流式回答，并给出来源引用。同时支持生成结构化摘要和思维导图（可选）。

核心目标是作为**前端求职作品集**，展示以下能力：
- 全栈 AI 应用开发（Next.js 全栈）
- Vercel AI SDK 的实际运用（流式输出、工具调用、结构化输出）
- RAG 完整链路（文档处理 → embedding → 向量检索 → 增强生成）
- 前端交互与流式渲染、来源引用展示
- 数据库与向量存储的工程化使用

## 二、核心功能清单

1. **文档上传与解析**
   - 支持 PDF、Markdown
   - 解析文本、按策略切分 chunk

2. **向量化与存储**
   - 对每个 chunk 生成 embedding
   - 存入向量数据库，并保存来源元数据（文件名、页码、chunk 序号等）

3. **基于文档的问答**
   - 用户提问 → 问题向量化 → 检索最相关 chunk → 拼上下文 → LLM 流式回答
   - 回答中标注来源引用（可点击/可展开）

4. **结构化摘要（可选但推荐）**
   - 对单篇文档生成结构化摘要（如：核心观点、关键数据、结论）
   - 使用 generateObject + Zod schema

5. **思维导图生成（可选）**
   - 将文档结构或摘要转为思维导图数据，前端渲染

6. **聊天界面**
   - 流式打字机效果
   - 消息历史
   - 来源引用展示
   - 上传入口与文档管理

## 三、首选技术栈（可按你建议调整）

### 前端
- Next.js（App Router）
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Vercel AI SDK 的 `useChat` 管理对话与流式渲染
- Framer Motion 做动效（可选）

### 后端（BFF 层）
- Next.js Route Handlers（`app/api/...`）
- Vercel AI SDK：
  - `streamText` 用于流式问答
  - `tool()` 定义文档检索工具
  - `generateObject` 用于结构化摘要
  - `embed` / `embedMany` 生成向量
- 文档解析：`pdf-parse`、`mammoth` 或类似库
- 文本切分：自定义或使用 `langchain/text_splitter`

### 数据库与存储
- **向量存储首选**：Postgres + pgvector（Neon 或 Supabase）
- **ORM**：Drizzle 或 Prisma（二选一，我倾向 Drizzle）
- **文件存储**：Vercel Blob（存原始 PDF/Markdown）
- 备选轻量方案：Upstash Vector + Upstash Redis

### AI 模型
- Embedding：OpenAI `text-embedding-3-small` 或同等
- LLM：OpenAI GPT-4o / GPT-4o-mini，或 Anthropic Claude
- 通过 Vercel AI Gateway 统一调用（方便切换模型）

### 部署
- Vercel

## 四、你的工作流程要求

1. **先不要直接给方案或写代码。**
2. 请先向我提出**澄清问题**，需要确认的细节可能包括但不限于：
   - 是否需要用户认证？单用户还是多用户？
   - 文档规模预期？单文件大小限制？
   - 是否需要支持扫描版 PDF（OCR）？
   - 摘要和思维导图是必须还是可选？
   - 你更希望用 Postgres+pgvector 还是 Upstash 这类托管向量库？
   - 是否有现成的 OpenAI / Anthropic API Key？
   - 项目时间预算是多少？希望先做 MVP 还是完整功能？
   - 是否需要我提供 UI 设计稿或参考风格？
   - 部署目标是否确定是 Vercel？
3. 等我回答完你的问题后，再进入 **plan mode**，输出一份分阶段的开发计划，包括：
   - 阶段划分与里程碑
   - 每个阶段的技术任务拆解
   - 数据模型设计（表结构、向量维度、元数据字段）
   - API 路由设计
   - 关键难点与应对策略
   - 可选的优化项（如 rerank、引用高亮、多文档对比等）

现在，请开始向我提问。