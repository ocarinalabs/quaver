/**
 * Benchmark Result Types
 *
 * Types for tracking and persisting benchmark results.
 */

/** Step log entry for tracking progress */
type StepLog = {
  step: number;
  score: number;
};

/** Complete benchmark result */
type BenchmarkResult = {
  /** Final step reached */
  finalStep: number;

  /** Final score (primary metric) */
  score: number;

  /** Whether simulation ended early due to termination condition */
  terminated: boolean;

  /** Reason for termination (if applicable) */
  terminationReason?: string;

  /** Step-by-step progress log */
  stepLog: StepLog[];

  /** Model used for the run */
  model: string;

  /** ISO timestamp when run started */
  startedAt: string;

  /** ISO timestamp when run ended */
  endedAt: string;

  /** Total elapsed time in seconds */
  elapsedSeconds: number;

  /** Whether run was interrupted (Ctrl+C) */
  interrupted?: boolean;
};

export type { BenchmarkResult, StepLog };
