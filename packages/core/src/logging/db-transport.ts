/**
 * SQLite Transport for Pino
 *
 * Persists log entries to the benchmark results database.
 * Runs in a worker thread via pino.transport for non-blocking writes.
 */

import build from "pino-abstract-transport";
import {
  completeRun,
  insertRun,
  insertStep,
  insertToolCall,
} from "../db/queries.js";
import { initSchema } from "../db/schema.js";
import type { LogData } from "../db/types.js";

type TransportOptions = {
  runId: string;
  benchmark: string;
  model: string;
};

type LogObject = LogData & {
  type?: string;
  tool?: string;
  finalScore?: number;
};

export default async function (opts: TransportOptions) {
  await initSchema();
  await insertRun({
    id: opts.runId,
    benchmark: opts.benchmark,
    model: opts.model,
  });

  let stepNumber = 0;

  return build(async (source) => {
    for await (const log of source as AsyncIterable<LogObject>) {
      stepNumber += 1;

      const stepId = await insertStep({
        runId: opts.runId,
        stepNumber,
        type: log.type ?? "unknown",
        data: log,
      });

      if (log.type === "tool" && log.tool) {
        await insertToolCall({
          runId: opts.runId,
          stepId,
          toolName: log.tool,
          input: log.input,
          output: log.output,
        });
      }

      if (log.type === "end") {
        await completeRun(opts.runId, log.finalScore ?? 0);
      }
    }
  });
}
