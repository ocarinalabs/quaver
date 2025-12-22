/**
 * Zod Schemas for Log Entry Validation
 *
 * Use these schemas in the analyzer to parse and validate log files.
 */

import { z } from "zod";

// Base fields present in all log entries
const BaseLogEntry = z.object({
  level: z.string(),
  time: z.string(),
  benchmark: z.literal(true),
  msg: z.string(),
});

// Start of benchmark
export const StartLog = BaseLogEntry.extend({
  type: z.literal("start"),
  benchmark: z.string(),
  model: z.string(),
});

// End of benchmark
export const EndLog = BaseLogEntry.extend({
  type: z.literal("end"),
});

// Model thinking/reasoning
export const ThinkingLog = BaseLogEntry.extend({
  type: z.literal("thinking"),
});

// Tool call with input and output
export const ToolLog = BaseLogEntry.extend({
  type: z.literal("tool"),
  tool: z.string(),
  input: z.unknown(),
  output: z.unknown(),
});

// State transition (hour, day, etc.)
export const TransitionLog = BaseLogEntry.extend({
  type: z.literal("transition"),
  from: z.string(),
  to: z.string(),
  balance: z.number().optional(),
  rating: z.number().optional(),
  fuel: z.number().optional(),
});

// Progress update
export const ProgressLog = BaseLogEntry.extend({
  type: z.literal("progress"),
  current: z.number(),
  total: z.number(),
  label: z.string().optional(),
});

// State snapshot (flexible fields)
export const StateLog = BaseLogEntry.extend({
  type: z.literal("state"),
  label: z.string(),
}).passthrough();

// Union of all log types
export const BenchmarkLogEntry = z.discriminatedUnion("type", [
  StartLog,
  EndLog,
  ThinkingLog,
  ToolLog,
  TransitionLog,
  ProgressLog,
  StateLog,
]);

// TypeScript types inferred from schemas
export type StartLog = z.infer<typeof StartLog>;
export type EndLog = z.infer<typeof EndLog>;
export type ThinkingLog = z.infer<typeof ThinkingLog>;
export type ToolLog = z.infer<typeof ToolLog>;
export type TransitionLog = z.infer<typeof TransitionLog>;
export type ProgressLog = z.infer<typeof ProgressLog>;
export type StateLog = z.infer<typeof StateLog>;
export type BenchmarkLogEntry = z.infer<typeof BenchmarkLogEntry>;

// Helper to parse a log file
export const parseLogFile = (content: string): BenchmarkLogEntry[] =>
  content
    .split("\n")
    .filter(Boolean)
    .map((line) => BenchmarkLogEntry.parse(JSON.parse(line)));

// Helper to safely parse (returns result with errors)
export const safeParseLogFile = (
  content: string
):
  | { success: true; data: BenchmarkLogEntry[] }
  | { success: false; errors: z.ZodError[] } => {
  const lines = content.split("\n").filter(Boolean);
  const results: BenchmarkLogEntry[] = [];
  const errors: z.ZodError[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      const result = BenchmarkLogEntry.safeParse(parsed);
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push(result.error);
      }
    } catch {
      // Skip non-JSON lines
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }
  return { success: true, data: results };
};
