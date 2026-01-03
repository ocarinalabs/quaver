/**
 * DB Stream for Pino Multistream
 *
 * A Writable stream that persists logs to SQLite.
 * Runs in-process (no worker threads) for Bun compatibility.
 */

import { Writable } from "node:stream";
import {
  completeRun,
  insertModelOutput,
  insertModelRequest,
  insertReasoningPart,
  insertRun,
  insertStep,
  insertToolCall,
  insertUsage,
} from "../db/queries.js";
import { initSchema } from "../db/schema.js";

type DbStreamOptions = {
  runId: string;
  benchmark: string;
  model: string;
};

type UsageState = {
  totalInputTokens: number;
  totalOutputTokens: number;
};

type ReasoningPartLog = {
  type: "reasoning";
  text: string;
};

type LogObject = {
  type?: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  finalScore?: number;
  inputTokens?: number;
  outputTokens?: number;
  inputTokenDetails?: {
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  outputTokenDetails?: {
    reasoningTokens?: number;
  };
  totalUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  generationId?: string;
  gatewayCost?: number;
  // Flight Recorder fields
  prompt?: string;
  systemPrompt?: string;
  text?: string;
  reasoningText?: string;
  reasoning?: ReasoningPartLog[];
  finishReason?: string;
  stepType?: string;
};

const handleToolLog = async (
  log: LogObject,
  runId: string,
  stepId: number
): Promise<void> => {
  if (!log.tool) {
    return;
  }
  await insertToolCall({
    runId,
    stepId,
    toolName: log.tool,
    input: log.input,
    output: log.output,
  });
};

const handleUsageLog = async (
  log: LogObject,
  runId: string,
  stepId: number,
  state: UsageState
): Promise<void> => {
  if (log.inputTokens === undefined) {
    return;
  }
  state.totalInputTokens += log.inputTokens;
  state.totalOutputTokens += log.outputTokens ?? 0;
  await insertUsage({
    runId,
    stepId,
    inputTokens: log.inputTokens,
    outputTokens: log.outputTokens ?? 0,
    cacheReadTokens: log.inputTokenDetails?.cacheReadTokens,
    cacheWriteTokens: log.inputTokenDetails?.cacheWriteTokens,
    reasoningTokens: log.outputTokenDetails?.reasoningTokens,
  });
};

const handleEndLog = async (
  log: LogObject,
  runId: string,
  state: UsageState
): Promise<void> => {
  const cost = log.gatewayCost ?? 0;
  await completeRun(runId, log.finalScore ?? 0, {
    inputTokens: log.totalUsage?.inputTokens ?? state.totalInputTokens,
    outputTokens: log.totalUsage?.outputTokens ?? state.totalOutputTokens,
    cost,
  });
};

const handleRequestLog = async (
  log: LogObject,
  runId: string,
  stepNumber: number
): Promise<void> => {
  if (!log.prompt) {
    return;
  }
  await insertModelRequest({
    runId,
    stepNumber,
    prompt: log.prompt,
    systemPrompt: log.systemPrompt,
  });
};

const handleOutputLog = async (
  log: LogObject,
  runId: string,
  stepId: number
): Promise<void> => {
  if (!(log.finishReason || log.reasoning || log.reasoningText)) {
    return;
  }
  const outputId = await insertModelOutput({
    runId,
    stepId,
    stepType: log.stepType,
    finishReason: log.finishReason,
    text: log.text,
    reasoningText: log.reasoningText,
  });

  if (log.reasoning && log.reasoning.length > 0) {
    for (const [index, part] of log.reasoning.entries()) {
      await insertReasoningPart({
        runId,
        outputId,
        partIndex: index,
        text: part.text,
      });
    }
  }
};

const createDbStream = (opts: DbStreamOptions): Writable => {
  let initialized = false;
  let stepNumber = 0;
  const usageState: UsageState = { totalInputTokens: 0, totalOutputTokens: 0 };

  const processLog = async (log: LogObject): Promise<void> => {
    if (!initialized) {
      await initSchema();
      await insertRun({
        id: opts.runId,
        benchmark: opts.benchmark,
        model: opts.model,
      });
      initialized = true;
    }

    stepNumber += 1;
    const stepId = await insertStep({
      runId: opts.runId,
      stepNumber,
      type: log.type ?? "unknown",
      data: log,
    });

    if (log.type === "tool") {
      await handleToolLog(log, opts.runId, stepId);
    }
    if (log.type === "usage") {
      await handleUsageLog(log, opts.runId, stepId, usageState);
    }
    if (log.type === "request") {
      await handleRequestLog(log, opts.runId, stepNumber);
    }
    if (log.type === "output") {
      await handleOutputLog(log, opts.runId, stepId);
    }
    if (log.type === "end") {
      await handleEndLog(log, opts.runId, usageState);
    }
  };

  return new Writable({
    objectMode: true,

    async write(chunk: string | LogObject, _encoding, callback) {
      try {
        const log: LogObject =
          typeof chunk === "string" ? JSON.parse(chunk) : chunk;
        await processLog(log);
        callback();
      } catch (err) {
        callback(err as Error);
      }
    },
  });
};

export { createDbStream };
export type { DbStreamOptions };
