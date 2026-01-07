"use client";

import {
  Conversation,
  ConversationContent,
} from "@quaver/ui/components/ai-elements/conversation";
import { Loader } from "@quaver/ui/components/ai-elements/loader";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@quaver/ui/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@quaver/ui/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@quaver/ui/components/ai-elements/tool";
import type { ToolUIPart, UIMessage } from "ai";
import { useEffect, useRef } from "react";

type QuaverToolCall = {
  id: string;
  name: string;
  input: unknown;
  output?: string;
  state: string;
};

type Project = {
  id: string;
  previewUrl?: string;
};

type ProjectMessagesProps = {
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  currentProject: Project | null;
};

function renderToolPart(
  part: ToolUIPart,
  messageId: string,
  index: number
): React.ReactNode {
  const toolOutput = part.output as
    | { toolCalls?: QuaverToolCall[]; result?: string }
    | undefined;

  return (
    <Tool
      defaultOpen={part.state === "output-available"}
      key={`${messageId}-${index}`}
    >
      <ToolHeader state={part.state} type={part.type} />
      <ToolContent>
        <ToolInput input={part.input} />
        {part.output !== undefined && (
          <ToolOutput errorText={part.errorText} output={toolOutput?.result} />
        )}

        {part.type === "tool-chatQuaver" && toolOutput?.toolCalls && (
          <div className="space-y-2 border-t p-4">
            <h4 className="font-medium text-muted-foreground text-xs uppercase">
              Quaver Tool Calls
            </h4>
            {toolOutput.toolCalls.map((tc) => (
              <Tool defaultOpen={tc.state === "output-available"} key={tc.id}>
                <ToolHeader
                  state={tc.state as ToolUIPart["state"]}
                  title={tc.name}
                  type={`tool-${tc.name}` as ToolUIPart["type"]}
                />
                <ToolContent>
                  <ToolInput input={tc.input} />
                  {tc.output && (
                    <ToolOutput errorText={undefined} output={tc.output} />
                  )}
                </ToolContent>
              </Tool>
            ))}
          </div>
        )}
      </ToolContent>
    </Tool>
  );
}

export function ProjectMessages({
  messages,
  status,
  currentProject: _currentProject,
}: ProjectMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messageCount = messages.length;
  useEffect(() => {
    if (messageCount > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageCount]);

  if (messages.length === 0) {
    return (
      <Conversation>
        <ConversationContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Start a conversation to build your project
          </div>
        </ConversationContent>
      </Conversation>
    );
  }

  return (
    <Conversation>
      <ConversationContent>
        {messages.map((message) => (
          <Message from={message.role} key={message.id}>
            <MessageContent>
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return (
                      <MessageResponse key={`${message.id}-${i}`}>
                        {part.text}
                      </MessageResponse>
                    );
                  case "reasoning": {
                    const duration =
                      "duration" in part
                        ? (part.duration as number | undefined)
                        : undefined;
                    return (
                      <Reasoning
                        duration={duration}
                        isStreaming={
                          status === "streaming" &&
                          i === message.parts.length - 1 &&
                          message.id === messages.at(-1)?.id
                        }
                        key={`${message.id}-${i}`}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  }
                  default:
                    if (part.type.startsWith("tool-")) {
                      return renderToolPart(part as ToolUIPart, message.id, i);
                    }
                    return null;
                }
              })}
            </MessageContent>
          </Message>
        ))}
        {status === "submitted" && (
          <div className="flex justify-center py-4">
            <Loader className="text-gray-500 dark:text-gray-400" size={16} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </ConversationContent>
    </Conversation>
  );
}
