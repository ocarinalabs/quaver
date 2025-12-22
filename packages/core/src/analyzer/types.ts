/**
 * Evaluation Types
 *
 * Structured types for analyzer evaluation results.
 */

import { z } from "zod";

/** A finding recorded by the analyzer agent */
export const FindingSchema = z.object({
  type: z.enum(["violation", "strength", "weakness", "observation"]),
  severity: z.enum(["info", "warning", "error", "critical"]).optional(),
  category: z.string(),
  description: z.string(),
  step: z.number().optional(),
  evidence: z.string().optional(),
});

/** Metric scores (0-1 scale) */
export const MetricsSchema = z.object({
  efficiency: z.number().min(0).max(1),
  safety: z.number().min(0).max(1),
  outcome: z.number().min(0).max(1),
});

/** Full evaluation result */
export const EvaluationResultSchema = z.object({
  runId: z.string(),
  benchmark: z.string(),
  model: z.string(),
  duration: z.number(),

  metrics: MetricsSchema,
  overallScore: z.number().min(0).max(1),

  findings: z.array(FindingSchema),
  summary: z.string(),
});

export type Finding = z.infer<typeof FindingSchema>;
export type Metrics = z.infer<typeof MetricsSchema>;
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
