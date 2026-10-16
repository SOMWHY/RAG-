# RAG 知识助手

基于 RAG（检索增强生成）的文档问答与知识管理应用。上传 PDF / Markdown，系统自动分页解析、切分、向量化入库；随后可用自然语言提问，AI 基于检索片段流式作答并附来源引用，还能对单篇文档生成结构化摘要与思维导图。

## 功能特性

**检索与问答**

- 文档上传：支持 PDF、Markdown，含拖拽上传，单文件上限 4MB（对齐 Vercel 请求体限制）
- 分页解析：PDF 按页提取文本，来源引用可定位到具体页码
- 智能切分：段落感知切分（1800 字符 / 240 重叠），保留页码归属
- 向量化：批量 embedding + 分批入库，写入 pgvector（1536 维）
- 语义检索：余弦相似度 + HNSW 索引，带相似度阈值过滤
- 流式问答：单一流式连接返回文本，**来源引用随流下发，不产生二次请求**
- 来源追溯：每条回答附来源卡片（文档名 + 页码 + 相似度）
- 文档删除：列表项可删除文档，级联清除其片段与统计（不可恢复）

**知识视图**

- 结构化摘要：`generateObject` + Zod schema 输出核心观点 / 关键数据 / 结论 / 标签
- 思维导图：模型输出扁平节点，前端纯 SVG 渲染可折叠主题树（支持缩放与平移）
- 原文片段浏览：按 chunk 列出原文与页码，与聊天引用形成闭环

**会话**

- 对话历史持久化：刷新后可恢复，支持多会话切换与删除
- 指定文档提问：输入框输入 `@` 弹出文档列表，可多选；选中后本次提问只在这些文档内检索
- 响应式：桌面三栏（文档 / 聊天 / 详情），移动端底部标签切换

**账号与数据隔离**

- GitHub OAuth 登录：无注册表单、无密码，任何 GitHub 账号均可登录
- 全站强制登录：未登录访问首页跳转 `/login`，调用 API 返回 401
- 数据隔离：文档、会话、消息按用户隔离，越权访问一律 404（不泄露资源是否存在）
- 检索隔离：向量检索只在自己的文档范围内进行，不会命中他人片段

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Next.js 16（App Router）+ React 19 + TypeScript |
| 样式 | Tailwind CSS v4 + `@tailwindcss/typography` |
| AI | `ai@7` + `@ai-sdk/react` + `@ai-sdk/openai` |
| 数据库 | Neon Postgres + pgvector + Drizzle ORM |
| 校验 | Zod 4 |
| 解析 | `pdf-parse` v2、`mammoth` |

### AI SDK 用法

- `useChat`（`@ai-sdk/react`）：管理对话与流式渲染，`sendMessage` + `status` 驱动交互
- `streamText` + `toUIMessageStream` / `createUIMessageStreamResponse`：流式回答
- `messageMetadata`：把 RAG 来源作为消息元数据随流下发
- `convertToModelMessages`：把 `UIMessage[]`（parts）转为 `ModelMessage[]` 供模型消费
- `generateObject` + Zod：结构化摘要与思维导图
- `embed` / `embedMany`：问题与文档的向量化

## 快速开始

```bash
# 1. 安装依赖
npm install
# Windows / WSL 若遇到 symlink 权限问题：
npm install --no-bin-links

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 DATABASE_URL / DATABASE_URL_UNPOOLED / AI_API_KEY

# 3. 启用 pgvector 扩展（必须，否则迁移会失败）
#    在 Neon SQL Editor 或任意 Postgres 客户端执行：
#    CREATE EXTENSION IF NOT EXISTS vector;

# 4. 数据库迁移（需要 Neon 数据库可访问）
npm run db:migrate

# 5. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | 运行时连接串（Neon **pooled**） |
| `DATABASE_URL_UNPOOLED` | 迁移用直连串，缺失时 `drizzle.config.ts` 会直接报错 |
| `AI_API_KEY` | OpenAI 或兼容网关的 API Key |
| `AI_BASE_URL` | OpenAI 兼容网关地址，如 `https://api.chatanywhere.tech/v1` |
| `AI_CHAT_MODEL` | 默认 `gpt-4o-mini` |
| `AI_EMBEDDING_MODEL` | 默认 `text-embedding-3-small`（1536 维） |
| `AUTH_SECRET` | 会话 JWT 签名密钥，必填。`openssl rand -base64 32` 生成 |
| `AUTH_GITHUB_ID` | GitHub OAuth App 的 Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App 的 Client Secret |
| `AUTH_REDIRECT_BASE_URL` | 可选。把 OAuth 回调固定到生产域名，用于预览环境（见下） |

> 模型与维度的唯一来源是 `src/lib/ai-config.ts`。**更换 embedding 模型必须同步改 `EMBEDDING_DIMENSIONS` 并重新迁移**，否则入库会因维度不匹配失败。

### 配置 GitHub 登录

1. 打开 https://github.com/settings/developers → **New OAuth App**
2. **Authorization callback URL** 填写（可填多行以支持多环境）：
   ```
   http://localhost:3000/api/auth/github/callback
   https://<你的生产域名>/api/auth/github/callback
   ```
3. 把 Client ID / Client Secret 填进 `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`

申请的权限只有 `read:user`，只读取昵称与头像，不接触仓库。

**关于 `AUTH_REDIRECT_BASE_URL`**：Vercel 预览环境每次域名都不同，而 GitHub 只能登记固定回调地址。给预览环境设置该变量为生产域名后，预览环境发起的登录会走生产回调，**登录完成后会落在生产站点**；不设置的话预览环境登录会报 `redirect_uri` 不匹配。

## 向量索引

当前 embedding 模型 `text-embedding-3-small` 输出 **1536 维**，在 pgvector 的 HNSW / IVFFlat **索引**上限（2000 维）内，因此 `chunks.embedding` 建了 HNSW 索引（`chunks_embedding_idx`，`vector_cosine_ops`）。

> 2000 维限制的是**索引**而非列：pgvector 的列最高支持 16000 维。换成 3072 维的 `text-embedding-3-large` 也能存，但索引建不出来，检索会退化为精确扫描。

**换 embedding 模型的代价（与维度无关）**：不同模型产出的向量不在同一个向量空间里，已入库的向量全部失效，必须重新向量化。`chunks.content` 里原文还在，**可以原地重算，不需要重新上传文件**。步骤：

1. 改 `src/lib/ai-config.ts` 的 `EMBEDDING_DIMENSIONS` 与 `DEFAULT_EMBEDDING_MODEL`；若新维度 > 2000，移除 `src/db/schema.ts` 里的 `chunks_embedding_idx`
2. `update chunks set embedding = null` —— 存在旧维度的向量时，改列类型会直接失败
3. `npm run db:generate && npm run db:migrate`
4. 分批读 `chunks.content` → 调 `/v1/embeddings` → 回写 `embedding`（实测 53 个片段约 47 秒）

## 数据模型

- **users**：`githubId`(unique) / `login` / `name` / `avatarUrl`
- **documents**：`userId` / `name` / `mimeType` / `size` / `status`(processing\|ready\|failed) / `pageCount` / `summary`(jsonb) / `mindmap`(jsonb)
- **chunks**：`documentId` / `content` / `chunkIndex` / `pageNumber` / `tokenCount` / `embedding`(vector 1536，带 HNSW 索引，见「向量索引」)
- **document_stats**：`documentId`(unique) / `chunkCount` / `avgDistance`
- **conversations**：`userId` / `title` / `createdAt` / `updatedAt`
- **conversation_messages**：`conversationId` / `role` / `parts`(jsonb) / `metadata`(jsonb)

`chunks` 与 `conversation_messages` **刻意不加 userId**，分别通过 join `documents`、join `conversations` 过滤，避免冗余字段与同步问题。

迁移文件位于 `drizzle/`：`0000` 初始结构、`0001` 会话与摘要字段、`0002` 向量维度改为 2048 并移除超限索引、`0003` 新增 users 与 userId 列、`0004` 向量维度改为 1536 并恢复 HNSW 索引。**不要修改已应用的迁移文件。**

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/documents` | 文档列表（含 chunk 数、是否已生成摘要/导图） |
| POST | `/api/documents` | 上传并处理文档（FormData `file`） |
| GET | `/api/documents/[id]` | 文档详情 + 全部片段 |
| DELETE | `/api/documents/[id]` | 删除文档，级联清除片段与统计（不可恢复） |
| GET/POST | `/api/documents/[id]/summary` | 读取 / 生成结构化摘要 |
| GET/POST | `/api/documents/[id]/mindmap` | 读取 / 生成思维导图 |
| POST | `/api/chat` | RAG 流式问答，来源随流下发。可选 `documentIds: string[]` 限定检索范围 |
| GET | `/api/config` | 返回当前生效模型（不含任何密钥） |
| GET/POST | `/api/conversations` | 会话列表 / 新建会话 |
| DELETE | `/api/conversations/[id]` | 删除会话 |
| GET/POST | `/api/conversations/[id]/messages` | 读取 / 追加会话消息 |
| GET | `/api/auth/github` | 发起 GitHub 授权（302 到 GitHub） |
| GET | `/api/auth/github/callback` | OAuth 回调，签发会话 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 当前登录用户 |

除 `/login` 与 `/api/auth/*` 外，所有路径都要求已登录：页面 302 到 `/login`，`/api/*` 返回 401。

### 指定文档提问（`@` 提及）

- 输入框输入 `@` 弹出候选文档，继续输入可过滤；`↑`/`↓` 移动，`Enter`/`Tab` 选中，`Esc` 关闭
- 选中的文档显示为输入框上方的标签，可点击移除；**发送后自动清空**，作用域只针对这一次提问
- 只有 `status = "ready"` 的文档会作为候选
- 触发判定在 `src/lib/mention.ts`：要求 `@` 位于开头或空白之后、且其后无空白，因此 `foo@bar.com`、`a@b` 不会误触发
- 服务端**严格限定**：指定了文档就只在这些文档内检索，命中为空就是空，不回退到全部文档
- 安全性：检索始终带 `documents.userId` 过滤，传入他人文档 id 只会检索不到；`documentIds` 会被过滤成非空字符串数组并截断到 20 个

## 部署（Vercel）

### 1. 提交代码

仓库已 `git init`，但**还没有任何提交**（`git log` 为空），Vercel 无法导入空仓库：

```bash
git add .
git commit -m "feat: RAG 知识助手"
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

> 注意：`.codebuddy/` 目前未被 `.gitignore` 忽略，是 IDE 数据。不想提交就先加进 `.gitignore`。

### 2. 导入 Vercel

在 Vercel 选择 Import Git Repository，其余保持默认即可：

| 项 | 值 |
| --- | --- |
| Framework Preset | Next.js（自动识别） |
| Build Command | `npm run build`（默认） |
| Install Command | `npm install`（默认） |
| Root Directory | `./` |

### 3. 配置环境变量

在 Project Settings → Environment Variables 填入（`.env.local` 已被忽略，不会上传）：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** 连接串（服务端运行时） |
| `DATABASE_URL_UNPOOLED` | 直连串（迁移用；Vercel 上一般不跑迁移，可填） |
| `AI_API_KEY` | 网关密钥 |
| `AI_BASE_URL` | 网关地址，如 `https://yujianwudi.top/v1` |
| `AI_CHAT_MODEL` | 可选，默认 `gpt-5.5` |
| `AI_EMBEDDING_MODEL` | 可选，默认 `nemotron-3-embed-1b` |
| `AUTH_SECRET` | **必填**，`openssl rand -base64 32` 生成 |
| `AUTH_GITHUB_ID` | **必填**，GitHub OAuth App 的 Client ID |
| `AUTH_GITHUB_SECRET` | **必填**，Client Secret |
| `AUTH_REDIRECT_BASE_URL` | 生产域名，如 `https://your-app.vercel.app`（预览环境需要） |

> `AUTH_SECRET` 缺失会导致每次冷启动签名密钥不同，登录后立刻掉线。

GitHub OAuth App 的回调地址要把生产域名加上（本地 `http://localhost:3000/...` 与生产两条）。

### 4. 确认数据库

Neon 需启用 pgvector（已在本库启用）：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

迁移已在本地应用到 `0003`，Vercel 部署时**无需**再跑。若要在 CI 里跑，需能连到 `DATABASE_URL_UNPOOLED`。

### 5. 部署前必须知道的两个限制

**① 请求体大小**：Vercel Serverless Function 的请求体硬上限是 **4.5MB**，超过直接返回 `413 FUNCTION_PAYLOAD_TOO_LARGE`，请求到不了你的函数。代码里 `MAX_FILE_SIZE` 已按 4MB 校验。要支持更大的文档需改用 Vercel Blob 客户端直传。

**② 函数超时**：`/api/documents` 设了 `maxDuration = 300`。启用 Fluid compute 的项目（新建项目默认开启）**Hobby 的默认时长和上限都是 300s**，所以这个值在 Hobby 上合法。若部署后上传大文档出现 `504 FUNCTION_INVOCATION_TIMEOUT`，说明确实跑不完，需改为异步任务 + 状态轮询。

**③ 访问保护**：项目是单用户设计，部署到公网后任何人都能上传文档、发起问答，会真实消耗你的 API 额度。免费的方案是 Vercel 的 **Vercel Authentication**（所有套餐可用），注意环境要选 `All Deployments`，否则生产域名仍公开。**Password Protection 仅 Pro（$20/月/项目）及以上可用，Hobby 没有。**

## 故障排查

### `'drizzle-kit' / 'next' / 'tsc' 不是内部或外部命令`

依赖若用 `npm install --no-bin-links` 安装（Windows 无 symlink 权限时常这么做），`node_modules/.bin` 会是空的，所有 npm script 都会报这个错。本项目 script 已改为 `node ./node_modules/<pkg>/<entry>` 直接调用真实入口，因此不受影响；但 `npx drizzle-kit` 仍不可用，请用 `npm run db:migrate`。

### 迁移报 `type "vector" does not exist` 或迁移无声失败

Neon 默认**没有**启用 pgvector。先执行：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

再 `npm run db:migrate`。

### 上传 PDF 报 `Failed to load external module pdf-parse...: ReferenceError: DOMMatrix is not defined`

serverless 环境专属，本地通常不复现。链路是：

1. pdfjs 在 Node 下靠 `require("@napi-rs/canvas")` 补 `DOMMatrix`（`pdfjs-dist/legacy/build/pdf.mjs:14336`）
2. 该 require 是 `createRequire` 动态调用，原生模块常没被打进产物，失败时 pdfjs **只 warn 不抛错**
3. 于是 `pdf.mjs:15620` 模块顶层的 `new DOMMatrix()` 直接抛 `ReferenceError`

本项目只用 `getText()` 做文本提取，不涉及渲染（矩阵运算只在渲染路径用到），因此 `src/lib/pdf-dom-shim.ts` 提供最小实现，并在 `parseDocument()` 里以**动态 import** 保证 shim 先于 pdf-parse 求值。

### 上传 PDF 报 `Setting up fake worker failed: Cannot find module ... pdf.worker.mjs`

pdfjs 在 Node 下会 `import(workerSrc)` 把 worker 当普通模块加载（fake worker）。该路径是**运行时拼出来的**，打包器无法静态解析，所以 `pdf.worker.mjs` 不会被追踪进产物，serverless 上就报找不到。

解决：`src/lib/pdf-dom-shim.ts` 的 `ensurePdfWorker()` 自己 import 一次 worker——worker 模块末尾会写入 `globalThis.pdfjsWorker`，pdfjs 检测到后**跳过**那次动态 import。

配套要点（改错就会复发）：

- `pdfjs-dist` **不能**放进 `serverExternalPackages`，否则这里的 import 退化成运行时从 `node_modules` 读，一样找不到文件
- `next.config.ts` 只外部化 `pdf-parse`
- 用 `pdf.worker.min.mjs`（1.1MB）而非未压缩版（2MB），已在 `src/types/pdfjs-worker.d.ts` 补类型声明

> 注意 `outputFileTracingIncludes` 不能用来修这个问题：它在 Next 16 + Turbopack 下未必生效。

### 模型明明可用，却报 `No available channel`

如果你用 `curl` 直接打 `/v1/chat/completions` 可以，但应用里报这个错，多半是 **API 形态**问题：`@ai-sdk/openai` 里 `provider(modelId)` 默认走 `/v1/responses`（Responses API），多数 OpenAI 兼容网关只实现 `/v1/chat/completions`。

本项目已固定使用 `getProvider().chat(...)`。若接入 OpenAI 官方并想用 Responses API，改 `src/lib/ai.ts` 的 `getChatModel()` 为 `.responses(...)`。

### `No available channel for model <模型名>`（模型确实不存在）

当前网关**没有**该模型。先列出可用模型：

```bash
curl -H "Authorization: Bearer $AI_API_KEY" https://<你的网关>/v1/models
```

再把 `AI_CHAT_MODEL` / `AI_EMBEDDING_MODEL` 改成列表里存在的名字。注意：这不是代码问题，也不一定是密钥无效——网关有密钥但无该模型通道时同样报这个错。

### 生成摘要 / 思维导图报 `服务暂时不可用…上游服务、网络链路或代理返回异常响应`

聊天正常但结构化输出失败时，是网关不接受 `generateObject` 的请求形态，不是代码 bug。

实测（同一模型、同一网关）：

| 请求形态 | 结果 |
| --- | --- |
| 普通 chat completion | ✅ 200 |
| `response_format: json_object` | ❌ 400 |
| `response_format: json_schema`（**简单** schema） | ✅ 200 |
| `response_format: json_schema`（**复杂** schema：嵌套数组 / optional 字段） | ❌ 400 |
| function calling / tools | ✅ 200 |

AI SDK v7 的 `generateObject` **固定**使用 `json_schema`，且 `mode` 参数已失效（`generateObject` 本身也已标记废弃），无法降级到 function calling——所以复杂 schema 必然踩中网关的 400。

本项目因此改用 `src/lib/structured-output.ts` 的 `generateStructured()`：**纯文本生成 + 自行提取 JSON + zod 校验**（失败自动纠错重试 1 次）。只依赖最基础的 `/v1/chat/completions`，任何 OpenAI 兼容网关都能用。

换成 OpenAI 官方后若想恢复原生结构化输出，把两个路由改回 `generateObject` 即可。

### 登录后立刻掉线，或反复跳回登录页

几乎总是 `AUTH_SECRET` 的问题：

- **没配** → 每次冷启动签名密钥不同，旧会话验签失败
- **配了但各环境值不同** → 跨环境互相验签失败

用 `openssl rand -base64 32` 生成，**同一个值**填到所有环境（本地、生产、预览）。

### 点登录跳回 `/login?error=xxx`

| 参数 | 含义 |
| --- | --- |
| `config` | 缺 `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` |
| `state` | state 校验失败，通常是超过 10 分钟才完成授权 |
| `code` | 未拿到授权码，多半是用户取消了授权 |
| `oauth` | GitHub 侧失败：回调地址未登记、Client ID/Secret 错，或网络不通 |

GitHub 报 `redirect_uri` 不匹配 = OAuth App 里没登记当前回调地址。预览环境域名不固定，需要给预览环境设 `AUTH_REDIRECT_BASE_URL` 指向生产域名。

### 模型在 `/v1/models` 里能列出，调用却返回 503「模型无返回结果」

免费中转常见：`/v1/models` 是静态列表，实际额度只覆盖其中一部分。实测（ChatAnywhere 免费档，2026-10）：

| 模型 | 结果 |
| --- | --- |
| `gpt-4o-mini` | ✅ 约 1.5s |
| `gpt-4.1-mini` | ✅ 约 2.4s |
| `deepseek-chat` | ✅ 约 5s |
| `gpt-3.5-turbo` | ⚠️ 可用但约 60s，实际不可用 |
| `gpt-5.5` / `gpt-5.4-mini` | ❌ 503 |

换模型只改 `AI_CHAT_MODEL`，无需改代码。注意 `gpt-5-mini`、`deepseek-v3.2` 这类带推理过程的模型，在 `max_tokens` 偏小时可能返回空内容。

### 应用报 `read ECONNRESET` / 连接超时

本项目实测出现过间歇性 `read ECONNRESET`：同一时刻直连端点连续成功、`-pooler` 端点 3 次中仅 1 次成功，稍后恢复后又 5/5 正常。多为 Neon 计算节点冷启动或本地网络抖动。

处理顺序：先重试一次；若持续失败，**本地可临时把 `DATABASE_URL` 也填成直连串**（与 `DATABASE_URL_UNPOOLED` 相同）。部署到 Vercel 时应换回 pooled 端点以获得连接复用。

## 已知限制

- 登录只支持 GitHub OAuth，未提供其他登录方式
- 删除文档不可恢复，且不会清理历史对话里残留的来源引用（对话按历史记录保留）
- `.docx` 解析能力已具备（`mammoth`），但上传入口仅放行 `.pdf` / `.md` / `.markdown`
- 上传为同步处理，超大文档建议改为后台任务 + 轮询状态
- 摘要与导图只取前 24 个片段作为上下文，超长文档会截断

## 常用命令

```bash
npm run dev        # 开发服务器
npm run build      # 生产构建
npm run typecheck  # 类型检查
npm run db:generate  # 生成迁移
npm run db:migrate   # 应用迁移
```

## License

MIT
