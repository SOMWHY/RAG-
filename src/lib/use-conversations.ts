"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatUIMessage } from "@/lib/chat-message";

export type ConversationItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      if (!response.ok) throw new Error("获取会话列表失败");
      setConversations((await response.json()) as ConversationItem[]);
    } catch (cause) {
      console.error("fetch conversations failed", cause);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (title?: string): Promise<string> => {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error("创建会话失败");
    const conversation = (await response.json()) as ConversationItem;
    setConversations((prev) => [conversation, ...prev]);
    return conversation.id;
  }, []);

  const remove = useCallback(async (id: string) => {
    setConversations((prev) => prev.filter((item) => item.id !== id));
    const response = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!response.ok) console.error("delete conversation failed", id);
  }, []);

  const loadMessages = useCallback(async (id: string): Promise<ChatUIMessage[]> => {
    const response = await fetch(`/api/conversations/${id}/messages`, { cache: "no-store" });
    if (!response.ok) {
      console.error("fetch messages failed", id);
      return [];
    }
    return (await response.json()) as ChatUIMessage[];
  }, []);

  const saveMessages = useCallback(
    async (id: string, messages: ChatUIMessage[], title?: string) => {
      const response = await fetch(`/api/conversations/${id}/messages`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ messages, title }),
      });
      if (!response.ok) console.error("save messages failed", id);
      else void refresh();
    },
    [refresh],
  );

  return { conversations, isLoading, refresh, create, remove, loadMessages, saveMessages };
}
