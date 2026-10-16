"use client";

import { useChat } from "@ai-sdk/react";
import { clsx } from "clsx";
import { BrainCircuit, Files, MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageList } from "@/components/chat/message-list";
import { ConversationList } from "@/components/conversation/conversation-list";
import { DocumentDetail } from "@/components/documents/document-detail";
import { DocumentList } from "@/components/documents/document-list";
import { getMessageText, type ChatUIMessage } from "@/lib/chat-message";
import { useConversations } from "@/lib/use-conversations";
import { useDocuments } from "@/lib/use-documents";

const SUGGESTIONS = [
  "这份文档的核心结论是什么？",
  "请列出文档中的关键数据",
  "文档提到了哪些限制或风险？",
];

type ModelInfo = { chatModel: string; embeddingModel: string };

export default function HomePage() {
  const { documents, isLoading: docsLoading, refresh: refreshDocuments } = useDocuments();
  const {
    conversations,
    isLoading: convLoading,
    create: createConversationRequest,
    remove: removeConversation,
    loadMessages,
    saveMessages,
  } = useConversations();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"chat" | "docs">("chat");
  const [input, setInput] = useState("");
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  /** 本次提问限定的文档；为空表示检索全部文档 */
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const conversationIdRef = useRef<string | null>(null);
  conversationIdRef.current = conversationId;

  const { messages, sendMessage, setMessages, status, stop, error } = useChat<ChatUIMessage>({
    // 首轮问答结束后把用户提问与助手回答一并落库，保证顺序且不影响首字延迟
    onFinish: ({ messages: all }) => {
      const id = conversationIdRef.current;
      if (!id) return;
      const pending = all.slice(-2);
      // 首轮对话用提问内容作为会话标题
      const title =
        all.length === 2 && pending[0] ? getMessageText(pending[0]).slice(0, 60) : undefined;
      void saveMessages(id, pending, title || undefined);
    },
  });

  const isStreaming = status === "submitted" || status === "streaming";
  const readyCount = documents.filter((doc) => doc.status === "ready").length;
  const hasDocuments = readyCount > 0;
  const selectedDocument = documents.find((doc) => doc.id === selectedId) ?? null;

  useEffect(() => {
    fetch("/api/config")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ModelInfo | null) => setModelInfo(data))
      .catch(() => setModelInfo(null));
  }, []);

  // 首次进入时自动接入最近会话，没有则新建
  useEffect(() => {
    if (convLoading || conversationId) return;
    const bootstrap = async () => {
      if (conversations.length > 0) {
        setConversationId(conversations[0].id);
      } else {
        try {
          setConversationId(await createConversationRequest());
        } catch (cause) {
          console.error("bootstrap conversation failed", cause);
        }
      }
    };
    void bootstrap();
  }, [convLoading, conversations, conversationId, createConversationRequest]);

  const selectConversation = async (id: string) => {
    setConversationId(id);
    setSelectedId(null);
    setMessages(await loadMessages(id));
  };

  const startNewConversation = async () => {
    const id = await createConversationRequest();
    setConversationId(id);
    setSelectedId(null);
    setMessages([]);
  };

  const deleteConversation = (id: string) => {
    void removeConversation(id);
    if (id === conversationId) {
      setConversationId(null);
      setMessages([]);
    }
  };

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || isStreaming) return;
    // 限定的文档通过 body 下发，服务端只在这些文档内检索
    const scope = selectedDocIds.length ? selectedDocIds : undefined;
    void sendMessage({ text: value }, scope ? { body: { documentIds: scope } } : undefined);
    setInput("");
    setSelectedDocIds([]);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-ink-950/80 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg gradient-brand shadow-[0_0_20px_-6px_var(--color-brand-500)]">
            <Sparkles className="size-4 text-white" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold text-ink-100">RAG 知识助手</h1>
            <p className="text-[11px] text-ink-500">文档问答与知识管理</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {modelInfo && (
            <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-ink-400 sm:inline-flex">
              <BrainCircuit className="size-3.5 text-accent-cyan" />
              {modelInfo.chatModel}
              <span className="text-ink-500">·</span>
              {modelInfo.embeddingModel}
            </span>
          )}
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-ink-400">
            {readyCount} 篇已就绪
          </span>
          <UserMenu />
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside
          className={clsx(
            "w-full shrink-0 flex-col gap-3 border-r border-white/10 bg-ink-900/40 p-3 lg:flex lg:w-80",
            mobileView === "docs" ? "flex" : "hidden",
          )}
        >
          <DocumentList
            documents={documents}
            isLoading={docsLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRefresh={refreshDocuments}
          />
          <ConversationList
            conversations={conversations}
            isLoading={convLoading}
            activeId={conversationId}
            onSelect={(id) => {
              void selectConversation(id);
              setMobileView("chat");
            }}
            onCreate={() => {
              void startNewConversation();
              setMobileView("chat");
            }}
            onRemove={deleteConversation}
          />
        </aside>

        <main
          className={clsx(
            "min-w-0 flex-1 flex-col lg:flex",
            mobileView === "chat" ? "flex" : "hidden",
          )}
        >
          <MessageList
            messages={messages}
            isLoading={isStreaming}
            suggestions={SUGGESTIONS}
            onPickSuggestion={submit}
            hasDocuments={hasDocuments}
          />

          {error && (
            <p className="mx-4 mb-2 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
              {error.message || "生成失败，请重试"}
            </p>
          )}

          <ChatInput
            value={input}
            isLoading={isStreaming}
            disabled={!hasDocuments}
            documents={documents}
            selectedDocIds={selectedDocIds}
            onSelectedDocIdsChange={setSelectedDocIds}
            onChange={setInput}
            onSubmit={() => submit(input)}
            onStop={() => stop()}
          />
        </main>

        {selectedDocument && (
          <div className="absolute inset-0 z-30 flex lg:static lg:z-auto">
            <button
              type="button"
              aria-label="关闭文档详情"
              onClick={() => setSelectedId(null)}
              className="flex-1 bg-ink-950/70 backdrop-blur-sm lg:hidden"
            />
            <DocumentDetail
              document={selectedDocument}
              onClose={() => setSelectedId(null)}
              onUpdated={refreshDocuments}
            />
          </div>
        )}
      </div>

      <nav className="flex shrink-0 border-t border-white/10 bg-ink-950/90 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setMobileView("chat")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs transition",
            mobileView === "chat" ? "text-brand-300" : "text-ink-500",
          )}
        >
          <MessageSquare className="size-4" /> 对话
        </button>
        <button
          type="button"
          onClick={() => setMobileView("docs")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs transition",
            mobileView === "docs" ? "text-brand-300" : "text-ink-500",
          )}
        >
          <Files className="size-4" /> 文档 {documents.length > 0 && `(${documents.length})`}
        </button>
      </nav>
    </div>
  );
}
