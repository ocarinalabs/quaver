/**
 * Step Advancement Simulation
 *
 * Orchestrates step transitions when agent calls waitForNextStep.
 *
 * [TODO]: Implement your step transition logic
 */

import { STEP_COST } from "@quaver/core/config/constants";
import type { YourBenchmarkState } from "@quaver/core/config/types";
import type { StepCostResult } from "@quaver/core/utils/fees";
import { applyStepCost } from "@quaver/core/utils/fees";
import { calculateScore } from "./scoring.js";

/** Report generated after each step transition */
type StepReport = {
  step: number;
  cost: StepCostResult;
  score: number;
  // [TODO]: Add more fields for your step transition events
};

/**
 * Advance simulation by one step.
 *
 * Sequential flow:
 * 1. Apply step cost
 * 2. [TODO]: Your step transition processing
 * 3. Increment step counter
 * 4. Reset waitingForNextStep flag
 *
 * @returns StepReport with cost status and score
 */
const advanceStep = (state: YourBenchmarkState): StepReport => {
  const cost = applyStepCost(state, STEP_COST);

  // [TODO]: Your step transition processing

  state.step += 1;
  state.waitingForNextStep = false;

  const score = calculateScore(state);

  return {
    step: state.step,
    cost,
    score,
  };
};

export { advanceStep };
export type { StepReport };
