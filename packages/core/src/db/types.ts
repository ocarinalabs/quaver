/**
 * Database Types
 *
 * Shared types for database operations.
 */

import { z } from "zod";

/** Run record schema */
export const RunSchema = z.object({
  id: z.string(),
  benchmark: z.string(),
  model: z.string(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  final_score: z.number().nullable(),
  status: z.string(),
});

/** Step record schema */
export const StepSchema = z.object({
  id: z.number(),
  run_id: z.string(),
  step_number: z.number(),
  type: z.string(),
  timestamp: z.string(),
  data: z.string().nullable(),
});

/** Tool call record schema */
export const ToolCallSchema = z.object({
  id: z.number(),
  run_id: z.string(),
  step_id: z.number().nullable(),
  tool_name: z.string(),
  input: z.string().nullable(),
  output: z.string().nullable(),
  duration_ms: z.number().nullable(),
});

/** Run record type */
export type Run = z.infer<typeof RunSchema>;

/** Step record type */
export type Step = z.infer<typeof StepSchema>;

/** Tool call record type */
export type ToolCall = z.infer<typeof ToolCallSchema>;

// biome-ignore lint/suspicious/noExplicitAny: Pino uses Record<string, any> for log data
export type LogData = Record<string, any>;
