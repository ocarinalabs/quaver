"use client";

import { api } from "@quaver/backend/convex/_generated/api";
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
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@quaver/ui/components/sidebar";
import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/sidebar/app-sidebar";

export default function Home() {
  const router = useRouter();
  const createProject = useAction(api.projects.actions.create);
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      setStatus("submitted");

      try {
        const { projectId } = await createProject({
          name: message.text.slice(0, 50),
          prompt: message.text,
        });

        setStatus("streaming");
        router.push(`/projects/${projectId}`);
      } catch (error) {
        console.error("Failed to create project:", error);
        setStatus("error");
        toast.error("Failed to create project. Retrying...");
        timeoutRef.current = setTimeout(() => {
          setStatus("ready");
          timeoutRef.current = null;
        }, 2000);
      }
    },
    [createProject, router]
  );

  const handleSuggestionClick = useCallback((suggestion: string) => {
    if (textareaRef.current) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      nativeInputValueSetter?.call(textareaRef.current, suggestion);
      textareaRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      textareaRef.current.focus();
    }
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-8 text-center">
            <div className="space-y-3">
              <h1 className="font-[family-name:var(--font-instrument-serif)] text-5xl tracking-tight">
                Measure safety. Measure capability.
              </h1>
              <p className="text-lg text-muted-foreground">
                Assess foundation models with private evaluators that test for
                safety and real-world performance.
              </p>
            </div>

            <div className="space-y-4">
              <PromptInput
                className="w-full"
                globalDrop
                multiple
                onSubmit={handleSubmit}
              >
                <PromptInputAttachments>
                  {(attachment) => <PromptInputAttachment data={attachment} />}
                </PromptInputAttachments>
                <PromptInputBody>
                  <PromptInputTextarea
                    disabled={status !== "ready"}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What do you want to evaluate?"
                    ref={textareaRef}
                    value={text}
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
                  </PromptInputTools>
                  <PromptInputSubmit status={status} />
                </PromptInputFooter>
              </PromptInput>

              <Suggestions>
                <Suggestion
                  onClick={() => handleSuggestionClick("Vending Bench")}
                  suggestion="Vending Bench"
                />
                <Suggestion
                  onClick={() => handleSuggestionClick("Rideshare Bench")}
                  suggestion="Rideshare Bench"
                />
                <Suggestion
                  onClick={() => handleSuggestionClick("Honeypotting AI")}
                  suggestion="Honeypotting AI"
                />
                <Suggestion
                  onClick={() => handleSuggestionClick("Alignment Faking")}
                  suggestion="Alignment Faking"
                />
              </Suggestions>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
