/**
 * Pino-based Logging System Types
 */

import type pino from "pino";

// Our preset aliases (map to Pino levels)
export type LogPreset = "silent" | "minimal" | "normal" | "verbose" | "debug";

// Structured log entry types (for Zod validation in analyzer)
export type BenchmarkLogType =
  | "start"
  | "end"
  | "thinking"
  | "tool"
  | "transition"
  | "state"
  | "progress";

// Logger configuration options
export type LogConfig = {
  pretty: boolean;
  base: Record<string, unknown>;
};

// AI SDK step type (subset of what we need)
// Matches the structure from AI SDK's onStepFinish callback
export type AgentStep = {
  text?: string;
  toolCalls?: Array<{
    toolName: string;
    input: unknown;
  }>;
  toolResults?: Array<{
    output: unknown;
  }>;
};

// Run metadata for start()
export type RunMetadata = {
  benchmark: string;
  model: string;
};

// Our domain-specific logger interface
export type Logger = {
  // Domain methods
  thinking: (text: string) => void;
  toolCall: (name: string, input: unknown, output: unknown) => void;
  state: (label: string, data: Record<string, unknown>) => void;
  transition: (
    from: string,
    to: string,
    metrics?: Record<string, number>
  ) => void;
  progress: (current: number, total: number, label?: string) => void;

  // AI SDK integration
  createStepHook: () => (step: AgentStep) => void;

  // Lifecycle
  start: (metadata: RunMetadata) => void;
  end: () => void;

  // Access underlying Pino logger
  pino: pino.Logger;

  // Child logger (inherits config + adds bindings)
  child: (bindings: Record<string, unknown>) => Logger;
};
