/**
 * Logging System Types
 */

import type pino from "pino";

export type LogPreset = "silent" | "minimal" | "normal" | "verbose" | "debug";

export type BenchmarkLogType =
  | "start"
  | "end"
  | "thinking"
  | "tool"
  | "transition"
  | "state"
  | "progress"
  | "request"
  | "output";

export type FinishReason =
  | "stop"
  | "length"
  | "tool-calls"
  | "content-filter"
  | "error"
  | "other";

export type StepType = "initial" | "continue" | "tool-result";

export type ReasoningPart = {
  type: "reasoning";
  text: string;
};

export type LogConfig = {
  pretty: boolean;
  base: Record<string, unknown>;
};

// Matches AI SDK v6 Usage type
export type Usage = {
  inputTokens?: number;
  outputTokens?: number;
  inputTokenDetails?: {
    noCacheTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  outputTokenDetails?: {
    textTokens?: number;
    reasoningTokens?: number;
  };
};

// Matches AI SDK onStepFinish callback
export type AgentStep = {
  text?: string;
  toolCalls?: Array<{
    toolName: string;
    input: unknown;
  }>;
  toolResults?: Array<{
    output: unknown;
  }>;
  usage?: Usage;
  // Flight Recorder fields
  reasoning?: ReasoningPart[];
  reasoningText?: string;
  finishReason?: FinishReason;
  stepType?: StepType;
};

export type RunMetadata = {
  benchmark: string;
  model: string;
};

export type EndData = {
  finalScore?: number;
  totalUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  generationId?: string;
  gatewayCost?: number;
};

export type Logger = {
  thinking: (text: string) => void;
  toolCall: (name: string, input: unknown, output: unknown) => void;
  state: (label: string, data: Record<string, unknown>) => void;
  transition: (
    from: string,
    to: string,
    metrics?: Record<string, number>
  ) => void;
  progress: (current: number, total: number, label?: string) => void;
  usage: (data: Usage) => void;
  request: (prompt: string, systemPrompt?: string) => void;
  createStepHook: () => (step: AgentStep) => void;
  start: (metadata: RunMetadata) => void;
  end: (data?: EndData) => void;
  pino: pino.Logger;
  child: (bindings: Record<string, unknown>) => Logger;
};
