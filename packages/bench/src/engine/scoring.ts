/**
 * Scoring and Termination Logic
 *
 * Defines success/failure metrics for the benchmark.
 *
 * [TODO]: Customize scoring based on your scenario
 */

import { FAILURE_THRESHOLD } from "../config/constants.js";
import type { YourBenchmarkState } from "../config/types.js";

/**
 * Check if simulation should terminate.
 *
 * Default: Terminate after too many consecutive failures.
 * [TODO]: Add other termination conditions if needed.
 */
const isTerminated = (state: YourBenchmarkState): boolean =>
  state.failureCount >= FAILURE_THRESHOLD;

/**
 * Calculate the primary score metric.
 *
 * Default: Return the current score.
 * [TODO]: Customize to include additional metrics.
 */
const calculateScore = (state: YourBenchmarkState): number => state.score;

/** Summary of current simulation state */
type SimulationSummary = {
  step: number;
  score: number;
  failureCount: number;
  isTerminated: boolean;
};

/**
 * Generate a summary of current simulation state.
 */
const getSimulationSummary = (
  state: YourBenchmarkState
): SimulationSummary => ({
  step: state.step,
  score: calculateScore(state),
  failureCount: state.failureCount,
  isTerminated: state.failureCount >= FAILURE_THRESHOLD,
});

export { calculateScore, getSimulationSummary, isTerminated };
export type { SimulationSummary };
