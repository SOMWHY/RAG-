# RAG 知识助手 · 开发状态

> 最后更新：本次重构后。本文档反映代码库真实状态，不再沿用此前"MVP 已完成"的描述。

## 一、起点：代码库实际情况

接手时的代码库存在**阻断性问题，前端无法运行**：

| 问题 | 现象 | 根因 |
| --- | --- | --- |
| `useChat` 导入断裂 | 模块解析失败 | `ai@7` 已移除 `ai/react` 子路径导出；`@ai-sdk/react` 未安装 |
| 消息类型失效 | 编译与运行均报错 | `ai` v7 删除 `Message` 类型，`UIMessage` 改用 `parts` 而非 `content` |
| 交互 API 失效 | `input` / `handleSubmit` 为 undefined | v5 起改为 `sendMessage` + `status` |
| 来源引用重复调用 | 每轮问答跑两遍 LLM | `onFinish` 里为读 `X-RAG-Sources` header 重发一次完整请求 |
| 页码恒为空 | "第 N 页"从不显示 | 解析返回了 `pageCount`，但入库时从未写入 `pageNumber` |
| Tailwind 版本错配 | 样式指令不匹配 | 装的是 v4，`globals.css` 用的是 v3 的 `@tailwind` 指令 |
| Markdown 无排版 | `prose` class 无效果 | `@tailwindcss/typography` 未安装 |
| 上传失败卡死 | 文档永久停留在"处理中" | catch 分支未回写 `status = "failed"` |
| 类型检查不可用 | `tsc` 无法执行 | TypeScript 7 平台包缺失 |
| 密钥泄露风险 | `.env.local` 会被提交 | `.gitignore` 未忽略 `.env*.local`，且仓库未初始化 |

## 二、已完成的修复

### 阻断项

- 安装 `@ai-sdk/react`、`@tailwindcss/typography`、TS 平台包
- 页面改用 `@ai-sdk/react` 的 `useChat`，自管输入状态，`sendMessage` + `status` 驱动
- 新增 `src/lib/chat-message.ts`：`ChatUIMessage` 类型契约 + `getMessageText(parts)`
- 消息渲染全部改为读 `parts`，来源改从 `message.metadata.sources` 读取
- `globals.css` 迁移到 Tailwind v4（`@import "tailwindcss"` + `@plugin` + `@theme` 令牌）
- 初始化 git 仓库并加固 `.gitignore`（忽略 `.env*.local`、`.next`、构建产物）

### 链路与可靠性

- 聊天路由改用 `toUIMessageStream` + `createUIMessageStreamResponse`，来源经 `messageMetadata` 随流下发，**删除重复请求与非 ASCII header**
- `streamText` 参数 `system` → `instructions`（前者已废弃），并用 `convertToModelMessages` 转换消息
- `parse-document.ts` 重写为 `pdf-parse` v2（`PDFParse` 类），返回分页结构
- `chunker.ts` 新增 `splitPages`，按页切分并保留 `pageNumber`
- 上传路由：分批入库（规避 Postgres 65535 参数上限）、失败回写 `failed`、写入 `documentStats`、移除动态 `import("drizzle-orm")`
- `search.ts`：新增相似度分数、`ready` 状态过滤与阈值过滤

### 增强功能

- **结构化摘要**：`generateObject` + Zod schema，落 `documents.summary`，前端卡片化展示
- **思维导图**：模型输出扁平节点（规避递归 schema 的 JSON Schema 转换风险），前端纯 SVG 渲染，支持折叠 / 缩放 / 平移
- **对话历史持久化**：新增 `conversations` / `conversation_messages` 表与完整 API，支持切换、新建、删除与刷新恢复
- **文档详情面板**：整合摘要、导图、原文片段三个视图，桌面右侧面板 / 移动端全屏

### 视觉

深色玻璃拟态 + 靛紫渐变风格（`Glassmorphism / Tech Dashboard`）：玻璃面板、渐变动效、来源卡片 hover 上浮、响应式三栏与移动端标签切换。

## 三、验证结果

- `npm run typecheck`：通过（0 错误）
- `next build`：通过，11 个路由全部产出
- 产物 CSS 已确认包含 `glass-panel` / `gradient-brand` / `prose-rag` / 设计色值等自定义令牌

## 四、待你执行 / 后续可选

### 网关模型适配（已处理）

默认模型在当前网关不可用，实测结果：

| 用途 | 原默认 | 现状 | 现用默认 |
| --- | --- | --- | --- |
| embedding | `text-embedding-3-small` | ❌ 无通道 | `nemotron-3-embed-1b`（2048 维 ✅） |
| embedding | — | ❌ 无通道 | ~~`nv-embed-v1`~~ |
| chat | `gpt-4o-mini` | ❌ 无通道 | `gpt-5.5` ✅（备选 `deepseek-v4-flash` / `glm-5.3-flash`） |

2048 维超过 pgvector HNSW 上限（2000 维，实测 `column cannot have more than 2000 dimensions for hnsw index`），因此：

- `drizzle/0002_embedding_2048.sql`：删除 `chunks_embedding_idx`，列改为 `vector(2048)`，已应用并验证
- 检索改为精确扫描；模型与维度收敛到 `src/lib/ai-config.ts` 单一来源，schema 不再硬编码
- `getProvider()` 增加 baseURL 合法性校验，避免把 API Key 填进 `AI_BASE_URL` 时只报 `Failed to parse URL`
- `getChatModel()` 改用 `.chat()`：直接 `provider(modelId)` 会走 `/v1/responses`，网关无该通道时同样报 "No available channel"

### 端到端实测（已通过）

用仓库内的 `overview.md` 真跑了一遍全链路：

- `POST /api/documents` → `status: "ready"`，2 个片段，2048 维向量入库成功
- `POST /api/chat` → 来源先随流下发（`score` 0.81 / 0.77），随后流式返回正文
- `POST /api/documents/[id]/summary` → `generateObject` 结构化输出正常（标题 / 概述 / 5 条带 `sourceRef` 的核心观点 / 关键数据）

### 数据库（已执行，已验证）

迁移已成功应用并验证：

- 5 张表：`documents` / `chunks` / `document_stats` / `conversations` / `conversation_messages`
- 新增列全部就位：`documents.page_count` / `documents.summary` / `documents.mindmap` / `chunks.page_number` / `conversation_messages.parts` / `conversation_messages.metadata` / `document_stats.chunk_count`
- `__drizzle_migrations` 共 2 条记录
- pgvector 扩展已启用

> 首次 `npm run db:migrate` 曾无声失败（exit 1 但无错误信息）：根因是 Neon 未启用 pgvector。手动 `CREATE EXTENSION IF NOT EXISTS vector` 后迁移成功。

### 建议

- **`DATABASE_URL` 偶发 `read ECONNRESET`**：曾出现直连成功、pooler 3 次仅 1 次成功的间歇抖动，稍后自行恢复（5/5 正常）。若持续失败，本地可临时把 `DATABASE_URL` 也填成直连串，部署 Vercel 时换回 pooled
- 在 `.env.local` 显式设置 `AI_BASE_URL`（当前未设置，会走代码内置默认网关）
- 大文档上传改为异步任务 + 状态轮询，避免 `maxDuration` 超时
- 如需部署到 Vercel Hobby，把 `/api/documents` 的 `maxDuration` 调回 60

### 未纳入本轮（按你的选择）

- 用户认证与多用户隔离
- 文档删除接口
- `.docx` 上传放行
- 引用内容悬浮预览（点击展开 chunk 全文）

## 五、作品集展示要点

1. **完整 RAG 链路**：分页解析 → 切分 → 批量向量化 → HNSW 检索 → 增强生成
2. **AI SDK v5 正确用法**：`useChat` / `toUIMessageStream` / `messageMetadata` / `convertToModelMessages` / `generateObject`
3. **工程判断力**：识别并修复"为拿来源重复调用 LLM"这类隐性成本问题
4. **向量数据库工程化**：pgvector + HNSW 索引 + 批量入库参数上限规避
5. **结构化输出**：Zod 契约驱动摘要与导图的生成、落库与渲染
