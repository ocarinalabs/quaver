/**
 * Base State Types
 *
 * Core state interface that all benchmarks extend.
 * Provides: step tracking, score, events, memory, step control.
 */

/** Event types that affect score */
type EventType = "cost" | "reward" | "penalty";

/** Record of a score-affecting event */
type Event = {
  id: string;
  type: EventType;
  delta: number;
  description: string;
  timestamp: Date;
};

/**
 * Base state that all benchmark scenarios extend.
 *
 * @example
 * ```typescript
 * interface MyBenchmarkState extends BaseState {
 *   items: Item[];
 *   metrics: Metrics;
 * }
 * ```
 */
type BaseState = {
  /** Current simulation step (starts at 1) */
  step: number;

  /** Flag set by waitForNextStep tool */
  waitingForNextStep: boolean;

  /** Current score (benchmark-defined metric) */
  score: number;

  /** All score-affecting events */
  events: Event[];

  /** Consecutive steps failing to meet requirements (triggers termination) */
  failureCount: number;

  /** Free-form text storage for agent notes */
  scratchpad: string;

  /** Key-value store for structured data */
  kvStore: Record<string, string>;

  /** Optional AgentFS instance for persistent storage (when using agentfs tools) */
  agent?: import("agentfs-sdk").AgentFS;
};

export type { BaseState, Event, EventType };
