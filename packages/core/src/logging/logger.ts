/**
 * Pino-based Logger Implementation
 *
 * Supports multi-transport for console + SQLite persistence.
 */

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pino from "pino";
import type {
  AgentStep,
  LogConfig,
  Logger,
  LogPreset,
  RunMetadata,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Options for DB persistence */
type PersistOptions = {
  runId?: string;
  benchmark?: string;
  model?: string;
  persist?: boolean;
};

// Map our presets to Pino levels
// Note: "silent" is a special Pino level, not part of pino.Level type
const PRESET_LEVELS: Record<LogPreset, string> = {
  silent: "silent",
  minimal: "warn",
  normal: "info",
  verbose: "debug",
  debug: "trace",
};

// Create logger methods from a Pino instance
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
  };

  const createStepHook = (): ((step: AgentStep) => void) => handleStep;

  const start = (metadata: RunMetadata): void => {
    log.info({ type: "start", ...metadata }, `Starting ${metadata.benchmark}`);
  };

  const end = (): void => {
    log.info({ type: "end" }, "Benchmark complete");
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
  const pretty = options?.pretty ?? process.env.NODE_ENV !== "production";
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
    const targets: pino.TransportTargetOptions[] = [];

    if (pretty) {
      targets.push({
        target: "pino-pretty",
        level,
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "HH:MM:ss",
        },
      });
    } else {
      targets.push({ target: "pino/file", level, options: { destination: 1 } });
    }

    targets.push({
      target: `${__dirname}/db-transport.js`,
      level,
      options: {
        runId,
        benchmark: options?.benchmark ?? "unknown",
        model: options?.model ?? "unknown",
      },
    });

    const transport = pino.transport({ targets });
    const log = pino(pinoOptions, transport);
    return createLoggerMethods(log);
  }

  const log = pretty
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
