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
  total_input_tokens: z.number().nullable(),
  total_output_tokens: z.number().nullable(),
  total_cost: z.number().nullable(),
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

/** Usage record schema */
export const UsageSchema = z.object({
  id: z.number(),
  run_id: z.string(),
  step_id: z.number().nullable(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_read_tokens: z.number().nullable(),
  cache_write_tokens: z.number().nullable(),
  reasoning_tokens: z.number().nullable(),
  timestamp: z.string(),
});

/** Run record type */
export type Run = z.infer<typeof RunSchema>;

/** Step record type */
export type Step = z.infer<typeof StepSchema>;

/** Tool call record type */
export type ToolCall = z.infer<typeof ToolCallSchema>;

/** Usage record type */
export type UsageRow = z.infer<typeof UsageSchema>;

// biome-ignore lint/suspicious/noExplicitAny: Pino uses Record<string, any> for log data
export type LogData = Record<string, any>;
