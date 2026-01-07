"use client";

import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from "@quaver/ui/components/ai-elements/context";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@quaver/ui/components/ai-elements/prompt-input";
import {
  Suggestion,
  Suggestions,
} from "@quaver/ui/components/ai-elements/suggestion";
import type { LanguageModelUsage } from "ai";
import { useCallback } from "react";

type ChatInputProps = {
  input: string;
  setInput: (input: string) => void;
  onSubmit: () => void;
  status: "submitted" | "streaming" | "ready" | "error";
  showSuggestions: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  usage?: LanguageModelUsage;
  maxTokens?: number;
  modelId?: string;
};

export function ChatInput({
  input,
  setInput,
  onSubmit,
  status,
  showSuggestions,
  textareaRef,
  disabled = false,
  usage,
  maxTokens,
  modelId,
}: ChatInputProps) {
  const handleSubmit = useCallback(
    (_promptMessage: PromptInputMessage) => {
      if (disabled) {
        return;
      }
      onSubmit();
    },
    [onSubmit, disabled]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (disabled) {
        return;
      }
      setInput(suggestion);
      setTimeout(() => {
        onSubmit();
      }, 0);
    },
    [setInput, onSubmit, disabled]
  );

  const isDisabled =
    disabled || status === "submitted" || status === "streaming";

  return (
    <div className="px-4 md:pb-4">
      <div className="flex gap-2">
        <PromptInput
          className="relative mx-auto w-full max-w-2xl"
          globalDrop
          multiple
          onSubmit={handleSubmit}
        >
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
          <PromptInputBody>
            <PromptInputTextarea
              className="min-h-[60px]"
              disabled={isDisabled}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                disabled
                  ? "Starting sandbox..."
                  : "Continue the conversation..."
              }
              ref={textareaRef}
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputSpeechButton textareaRef={textareaRef} />
              {usage && modelId && (
                <Context
                  maxTokens={maxTokens ?? 200_000}
                  modelId={modelId}
                  usage={usage}
                  usedTokens={usage.totalTokens ?? 0}
                >
                  <ContextTrigger />
                  <ContextContent>
                    <ContextContentHeader />
                    <ContextContentBody>
                      <ContextInputUsage />
                      <ContextOutputUsage />
                      <ContextReasoningUsage />
                      <ContextCacheUsage />
                    </ContextContentBody>
                    <ContextContentFooter />
                  </ContextContent>
                </Context>
              )}
            </PromptInputTools>
            <PromptInputSubmit disabled={!input} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
      {showSuggestions && (
        <div className="mx-auto mt-2 max-w-2xl">
          <Suggestions>
            <Suggestion
              onClick={() => handleSuggestionClick("Landing page")}
              suggestion="Landing page"
            />
            <Suggestion
              onClick={() => handleSuggestionClick("Todo app")}
              suggestion="Todo app"
            />
            <Suggestion
              onClick={() => handleSuggestionClick("Dashboard")}
              suggestion="Dashboard"
            />
            <Suggestion
              onClick={() => handleSuggestionClick("Blog")}
              suggestion="Blog"
            />
            <Suggestion
              onClick={() => handleSuggestionClick("E-commerce")}
              suggestion="E-commerce"
            />
            <Suggestion
              onClick={() => handleSuggestionClick("Portfolio")}
              suggestion="Portfolio"
            />
            <Suggestion
              onClick={() => handleSuggestionClick("Chat app")}
              suggestion="Chat app"
            />
            <Suggestion
              onClick={() => handleSuggestionClick("Calculator")}
              suggestion="Calculator"
            />
          </Suggestions>
        </div>
      )}
    </div>
  );
}
