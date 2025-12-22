/**
 * Step Cost Utility
 *
 * Generic step cost application that works with any state extending BaseState.
 */

import type { BaseState } from "@quaver/core/types/state";

/** Result of applying step cost */
type StepCostResult = {
  paid: boolean;
  amount: number;
  newScore: number;
  failureCount: number;
};

/**
 * Apply step cost to the score.
 * Updates state in place (score, failureCount, events).
 *
 * @param state - State object extending BaseState
 * @param costAmount - Amount to deduct from score
 * @returns StepCostResult with payment status and updated values
 */
const applyStepCost = <T extends BaseState>(
  state: T,
  costAmount: number
): StepCostResult => {
  if (state.score >= costAmount) {
    state.score -= costAmount;
    state.failureCount = 0;

    state.events.push({
      id: crypto.randomUUID(),
      type: "cost",
      delta: -costAmount,
      description: `Step cost (Step ${state.step})`,
      timestamp: new Date(),
    });

    return {
      paid: true,
      amount: costAmount,
      newScore: state.score,
      failureCount: 0,
    };
  }

  state.failureCount += 1;

  return {
    paid: false,
    amount: 0,
    newScore: state.score,
    failureCount: state.failureCount,
  };
};

export { applyStepCost };
export type { StepCostResult };
