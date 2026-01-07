"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

type StreamingHandoff = {
  chatId: string | null;
  stream: ReadableStream<Uint8Array> | null;
  userMessage: string | null;
};

type StreamingContextType = {
  handoff: StreamingHandoff;
  startHandoff: (
    chatId: string,
    stream: ReadableStream<Uint8Array>,
    userMessage: string
  ) => void;
  clearHandoff: () => void;
};

const StreamingContext = createContext<StreamingContextType | null>(null);

export function useStreaming() {
  const context = useContext(StreamingContext);
  if (!context) {
    throw new Error("useStreaming must be used within a StreamingProvider");
  }
  return context;
}

type StreamingProviderProps = {
  children: ReactNode;
};

export function StreamingProvider({ children }: StreamingProviderProps) {
  const [handoff, setHandoff] = useState<StreamingHandoff>({
    chatId: null,
    stream: null,
    userMessage: null,
  });

  const startHandoff = (
    chatId: string,
    stream: ReadableStream<Uint8Array>,
    userMessage: string
  ) => {
    setHandoff({ chatId, stream, userMessage });
  };

  const clearHandoff = () => {
    setHandoff({ chatId: null, stream: null, userMessage: null });
  };

  return (
    <StreamingContext.Provider
      value={{
        handoff,
        startHandoff,
        clearHandoff,
      }}
    >
      {children}
    </StreamingContext.Provider>
  );
}
