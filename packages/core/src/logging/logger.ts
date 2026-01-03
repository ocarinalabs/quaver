/**
 * Pino-based Logger Implementation
 *
 * Uses pino.multistream() for Bun compatibility (no worker threads).
 */

import pino from "pino";
import pretty from "pino-pretty";
import { createDbStream } from "./stream.js";
import type {
  AgentStep,
  EndData,
  LogConfig,
  Logger,
  LogPreset,
  RunMetadata,
} from "./types.js";

/** Options for DB persistence */
type PersistOptions = {
  runId?: string;
  benchmark?: string;
  model?: string;
  persist?: boolean;
};

const PRESET_LEVELS: Record<LogPreset, string> = {
  silent: "silent",
  minimal: "warn",
  normal: "info",
  verbose: "debug",
  debug: "trace",
};

const createLoggerMethods = (log: pino.Logger): Logger => {
  const thinking = (text: string): void => {
    log.info({ type: "thinking" }, text);
  };

  const toolCall = (name: string, input: unknown, output: unknown): void => {
    log.info({ type: "tool", tool: name, input, output }, `tool:${name}`);
  };

  const state = (label: string, data: Record<string, unknown>): void => {
    log.debug({ type: "state", label, ...data }, `state:${label}`);
  };

  const transition = (
    from: string,
    to: string,
    metrics?: Record<string, number>
  ): void => {
    log.info({ type: "transition", from, to, ...metrics }, `${from} -> ${to}`);
  };

  const progress = (current: number, total: number, label?: string): void => {
    log.info(
      { type: "progress", current, total, label },
      `[${current}/${total}]`
    );
  };

  const usage = (data: {
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
  }): void => {
    if (data.inputTokens !== undefined || data.outputTokens !== undefined) {
      log.info({ type: "usage", ...data }, "usage");
    }
  };

  const request = (prompt: string, systemPrompt?: string): void => {
    log.info({ type: "request", prompt, systemPrompt }, "request");
  };

  const logStepToolCalls = (step: AgentStep): void => {
    const calls = step.toolCalls ?? [];
    for (const [i, call] of calls.entries()) {
      const result = step.toolResults?.[i];
      toolCall(call.toolName, call.input, result?.output);
    }
  };

  const handleStep = (step: AgentStep): void => {
    if (step.text) {
      thinking(step.text);
    }
    if (step.toolCalls) {
      logStepToolCalls(step);
    }
    if (step.usage) {
      usage(step.usage);
    }
    // Flight Recorder: log model output with reasoning/finish reason
    if (step.finishReason || step.reasoning || step.reasoningText) {
      log.info(
        {
          type: "output",
          finishReason: step.finishReason,
          stepType: step.stepType,
          text: step.text,
          reasoningText: step.reasoningText,
          reasoning: step.reasoning,
        },
        `output:${step.finishReason ?? "unknown"}`
      );
    }
  };

  const createStepHook = (): ((step: AgentStep) => void) => handleStep;

  const start = (metadata: RunMetadata): void => {
    log.info({ type: "start", ...metadata }, `Starting ${metadata.benchmark}`);
  };

  const end = (data?: EndData): void => {
    log.info(
      {
        type: "end",
        finalScore: data?.finalScore,
        totalUsage: data?.totalUsage,
        generationId: data?.generationId,
        gatewayCost: data?.gatewayCost,
      },
      "Benchmark complete"
    );
  };

  const child = (bindings: Record<string, unknown>): Logger => {
    const childLog = log.child(bindings);
    return createLoggerMethods(childLog);
  };

  return {
    thinking,
    toolCall,
    state,
    transition,
    progress,
    usage,
    request,
    createStepHook,
    start,
    end,
    child,
    pino: log,
  };
};

export const createLogger = (
  preset: LogPreset = "normal",
  options?: Partial<LogConfig> & PersistOptions
): Logger => {
  const level = PRESET_LEVELS[preset];
  const usePretty = options?.pretty ?? process.env.NODE_ENV !== "production";
  const persist = options?.persist ?? false;

  const pinoOptions: pino.LoggerOptions = {
    level,
    base: { benchmark: true, ...options?.base },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  if (persist) {
    const runId = options?.runId ?? crypto.randomUUID();
    const streams: pino.StreamEntry[] = [];

    if (usePretty) {
      streams.push({
        stream: pretty({ colorize: true, ignore: "pid,hostname" }),
        level: level as pino.Level,
      });
    } else {
      streams.push({ stream: process.stdout, level: level as pino.Level });
    }

    streams.push({
      stream: createDbStream({
        runId,
        benchmark: options?.benchmark ?? "unknown",
        model: options?.model ?? "unknown",
      }),
      level: level as pino.Level,
    });

    const log = pino(pinoOptions, pino.multistream(streams));
    return createLoggerMethods(log);
  }

  const log = usePretty
    ? pino({
        ...pinoOptions,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "HH:MM:ss",
          },
        },
      })
    : pino(pinoOptions);

  return createLoggerMethods(log);
};
