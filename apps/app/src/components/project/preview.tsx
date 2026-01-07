"use client";

import {
  WebPreview,
  WebPreviewBody,
  WebPreviewConsole,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "@quaver/ui/components/ai-elements/web-preview";
import { cn } from "@quaver/ui/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Maximize,
  Minimize,
  MousePointerClick,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

type Chat = {
  id: string;
  demo?: string;
  url?: string;
};

type ConsoleLog = {
  level: "log" | "warn" | "error";
  message: string;
  timestamp: Date;
};

type PreviewPanelProps = {
  currentChat: Chat | null;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
  refreshKey: number;
  setRefreshKey: (key: number | ((prev: number) => number)) => void;
};

export function PreviewPanel({
  currentChat,
  isFullscreen,
  setIsFullscreen,
  refreshKey,
  setRefreshKey,
}: PreviewPanelProps) {
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    setConsoleLogs((prev) => [
      ...prev,
      {
        level: "log",
        message: "Preview refreshed",
        timestamp: new Date(),
      },
    ]);
  };

  const handleOpenInNewTab = () => {
    if (currentChat?.demo) {
      window.open(currentChat.demo, "_blank");
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col transition-all duration-300",
        isFullscreen ? "fixed inset-0 z-50 bg-white dark:bg-black" : "flex-1"
      )}
    >
      <WebPreview
        defaultUrl={currentChat?.demo || ""}
        onUrlChange={(url) => {
          setConsoleLogs((prev) => [
            ...prev,
            {
              level: "log",
              message: `Navigated to: ${url}`,
              timestamp: new Date(),
            },
          ]);
        }}
      >
        <WebPreviewNavigation>
          <WebPreviewNavigationButton
            disabled={!currentChat?.demo}
            onClick={() => {
              // Browser back - would need iframe history integration
            }}
            tooltip="Go back"
          >
            <ArrowLeft className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton
            disabled={!currentChat?.demo}
            onClick={() => {
              // Browser forward - would need iframe history integration
            }}
            tooltip="Go forward"
          >
            <ArrowRight className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton
            disabled={!currentChat?.demo}
            onClick={handleRefresh}
            tooltip="Reload"
          >
            <RefreshCw className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewUrl
            placeholder="Your app will appear here..."
            readOnly
            value={currentChat?.demo || ""}
          />
          <WebPreviewNavigationButton
            disabled={!currentChat?.demo}
            onClick={() => {
              // Element selector mode - would need iframe messaging
            }}
            tooltip="Select element"
          >
            <MousePointerClick className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton
            disabled={!currentChat?.demo}
            onClick={handleOpenInNewTab}
            tooltip="Open in new tab"
          >
            <ExternalLink className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton
            disabled={!currentChat?.demo}
            onClick={() => setIsFullscreen(!isFullscreen)}
            tooltip={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="size-4" />
            ) : (
              <Maximize className="size-4" />
            )}
          </WebPreviewNavigationButton>
        </WebPreviewNavigation>

        {currentChat?.demo ? (
          <WebPreviewBody key={refreshKey} src={currentChat.demo} />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-gray-50 dark:bg-black">
            <div className="text-center">
              <p className="font-medium text-gray-700 text-sm dark:text-gray-200">
                No preview available
              </p>
              <p className="text-gray-700/50 text-xs dark:text-gray-200/50">
                Start a conversation to see your app here
              </p>
            </div>
          </div>
        )}

        <WebPreviewConsole logs={consoleLogs} />
      </WebPreview>
    </div>
  );
}
