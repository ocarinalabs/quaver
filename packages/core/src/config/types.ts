/**
 * Benchmark State Types
 *
 * Extends BaseState with scenario-specific fields.
 *
 * [TODO]: Add your scenario-specific state fields
 */

import type { BaseState } from "@quaver/core/types/state";

// Re-export base types for convenience
export type { Event } from "@quaver/core/types/state";

/**
 * [TODO]: Rename to match your benchmark (e.g., TradingState, GameState)
 *
 * @example
 * ```typescript
 * interface MyBenchmarkState extends BaseState {
 *   items: Item[];
 *   metrics: Metrics;
 * }
 * ```
 */
interface YourBenchmarkState extends BaseState {
  // [TODO]: Add your scenario-specific fields
}

export type { YourBenchmarkState };
