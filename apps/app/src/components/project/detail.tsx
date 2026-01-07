"use client";

import { useChat } from "@ai-sdk/react";
import { api } from "@quaver/backend/convex/_generated/api";
import type { Id } from "@quaver/backend/convex/_generated/dataModel";
import { cn } from "@quaver/ui/lib/utils";
import type { LanguageModelUsage, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomToolbar } from "@/components/layout/bottom-toolbar";
import { ResizableLayout } from "@/components/layout/resizable-panel";
import { MAX_TOKENS, MODEL_ID } from "@/lib/model";
import { ChatInput } from "./input";
import { ProjectMessages } from "./messages";
import { PreviewPanel } from "./preview";

function trackReasoningTimes(
  message: UIMessage,
  timesRef: React.RefObject<Map<string, { start: number; duration?: number }>>
) {
  let lastReasoningKey: string | null = null;
  for (const [index, part] of message.parts.entries()) {
    const key = `${message.id}:${index}`;
    if (part.type === "reasoning") {
      if (!timesRef.current.has(key)) {
        timesRef.current.set(key, { start: Date.now() });
      }
      lastReasoningKey = key;
    } else if (lastReasoningKey) {
      const times = timesRef.current.get(lastReasoningKey);
      if (times && times.duration === undefined) {
        times.duration = Math.ceil((Date.now() - times.start) / 1000);
      }
      lastReasoningKey = null;
    }
  }
}

export function ProjectDetail() {
  const params = useParams();
  const projectId = params.id as string;

  const project = useQuery(api.projects.queries.getById, {
    projectId: projectId as Id<"projects">,
  });

  const savedMessages = useQuery(api.messages.queries.listByProject, {
    projectId: projectId as Id<"projects">,
  });

  const insertMessage = useMutation(api.messages.mutations.insert);

  const initialMessages = useMemo<UIMessage[]>(() => {
    if (!savedMessages) {
      return [];
    }
    return savedMessages.map((msg) => ({
      id: msg._id,
      role: msg.role,
      parts: msg.parts ?? [{ type: "text" as const, text: msg.content }],
    }));
  }, [savedMessages]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activePanel, setActivePanel] = useState<"chat" | "preview">("chat");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const hasSentInitialPrompt = useRef(false);
  const reasoningTimes = useRef<
    Map<string, { start: number; duration?: number }>
  >(new Map());
  const [usage] = useState<LanguageModelUsage>({
    inputTokens: 32_000,
    outputTokens: 8000,
    totalTokens: 40_000,
    cachedInputTokens: 0,
    reasoningTokens: 0,
    inputTokenDetails: {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokenDetails: { textTokens: undefined, reasoningTokens: undefined },
  });

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { projectId, sandboxId: project?.sandboxId },
      }),
    [projectId, project?.sandboxId]
  );

  const sandboxReady = !!project?.sandboxId;

  const { messages, sendMessage, status, setMessages } = useChat({
    id: `${projectId}-${project?.sandboxId ?? "pending"}`,
    transport,
    onFinish: async ({ message }) => {
      if (message.role === "assistant") {
        const persistableParts = message.parts
          .map((p, index) => {
            if (p.type === "text") {
              return { type: "text" as const, text: p.text };
            }
            if (p.type === "reasoning") {
              const key = `${message.id}:${index}`;
              const times = reasoningTimes.current.get(key);
              const duration = times?.duration;
              reasoningTimes.current.delete(key);
              return { type: "reasoning" as const, text: p.text, duration };
            }
            return null;
          })
          .filter(
            (
              p
            ): p is
              | { type: "text"; text: string }
              | { type: "reasoning"; text: string; duration?: number } =>
              p !== null
          );

        const textContent = message.parts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("\n");

        await insertMessage({
          projectId: projectId as Id<"projects">,
          role: "assistant",
          content: textContent || "[No text content]",
          parts: persistableParts.length > 0 ? persistableParts : undefined,
        });
      }
    },
  });

  useEffect(() => {
    if (status !== "streaming") {
      return;
    }
    const lastMessage = messages.at(-1);
    if (lastMessage?.role === "assistant") {
      trackReasoningTimes(lastMessage, reasoningTimes);
    }
  }, [messages, status]);

  useEffect(() => {
    if (savedMessages && savedMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [savedMessages, initialMessages, messages.length, setMessages]);

  useEffect(() => {
    if (
      project?.prompt &&
      project?.sandboxId &&
      savedMessages?.length === 0 &&
      messages.length === 0 &&
      !hasSentInitialPrompt.current &&
      status === "ready"
    ) {
      hasSentInitialPrompt.current = true;
      sendMessage({ text: project.prompt });
    }
  }, [project, savedMessages, messages.length, status, sendMessage]);

  const previewUrl = project?.sandboxId
    ? `https://3000-${project.sandboxId}.proxy.daytona.work`
    : undefined;

  const handleSubmit = () => {
    if (!(input.trim() && sandboxReady)) {
      return;
    }
    sendMessage({ text: input });
    setInput("");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div
      className={cn(
        "min-h-screen bg-background",
        isFullscreen && "fixed inset-0 z-50"
      )}
    >
      <div className="flex h-screen flex-col">
        <ResizableLayout
          activePanel={activePanel === "chat" ? "left" : "right"}
          className="min-h-0 flex-1"
          leftPanel={
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-y-auto">
                <ProjectMessages
                  currentProject={
                    project ? { id: project._id, previewUrl } : null
                  }
                  messages={messages}
                  status={status}
                />
              </div>

              <ChatInput
                disabled={!sandboxReady}
                input={input}
                maxTokens={MAX_TOKENS}
                modelId={MODEL_ID}
                onSubmit={handleSubmit}
                setInput={setInput}
                showSuggestions={messages.length === 0 && sandboxReady}
                status={status}
                textareaRef={textareaRef}
                usage={usage}
              />
            </div>
          }
          rightPanel={
            <PreviewPanel
              currentChat={
                project
                  ? {
                      id: project._id,
                      demo: previewUrl,
                    }
                  : null
              }
              isFullscreen={isFullscreen}
              refreshKey={refreshKey}
              setIsFullscreen={setIsFullscreen}
              setRefreshKey={setRefreshKey}
            />
          }
          singlePanelMode={false}
        />

        <div className="md:hidden">
          <BottomToolbar
            activePanel={activePanel}
            hasPreview={!!previewUrl}
            onPanelChange={setActivePanel}
          />
        </div>
      </div>
    </div>
  );
}
