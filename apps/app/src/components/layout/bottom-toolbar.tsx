"use client";

import { cn } from "@quaver/ui/lib/utils";
import { MessageSquare, Monitor } from "lucide-react";

type BottomToolbarProps = {
  activePanel: "chat" | "preview";
  onPanelChange: (panel: "chat" | "preview") => void;
  hasPreview: boolean;
};

export function BottomToolbar({
  activePanel,
  onPanelChange,
  hasPreview,
}: BottomToolbarProps) {
  return (
    <div className="bg-white px-2 py-4 dark:bg-black">
      <div className="mx-auto flex max-w-xs items-center justify-center">
        <div className="flex w-full rounded-lg bg-secondary p-1">
          <button
            className={cn(
              "flex h-8 flex-1 items-center justify-center gap-2 rounded-md font-medium text-xs transition-all duration-200",
              activePanel === "chat"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onPanelChange("chat")}
            type="button"
          >
            <MessageSquare className="h-3 w-3" />
            <span>Chat</span>
          </button>

          <button
            className={cn(
              "flex h-8 flex-1 items-center justify-center gap-2 rounded-md font-medium text-xs transition-all duration-200",
              activePanel === "preview"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
              !hasPreview &&
                "cursor-not-allowed opacity-50 hover:text-muted-foreground"
            )}
            disabled={!hasPreview}
            onClick={() => onPanelChange("preview")}
            type="button"
          >
            <Monitor className="h-3 w-3" />
            <span>Preview</span>
          </button>
        </div>
      </div>
    </div>
  );
}
