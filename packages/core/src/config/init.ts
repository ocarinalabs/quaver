/**
 * State Initialization
 *
 * Creates the initial simulation state.
 *
 * [TODO]: Initialize your scenario-specific state fields
 */

import { INITIAL_SCORE } from "./constants.js";
import type { YourBenchmarkState } from "./types.js";

/**
 * Create the initial state for a new simulation.
 *
 * [TODO]: Initialize your scenario-specific fields.
 */
const createInitialState = (): YourBenchmarkState => {
  return {
    // Base state (from BaseState)
    step: 1,
    waitingForNextStep: false,
    score: INITIAL_SCORE,
    events: [],
    failureCount: 0,
    scratchpad: "",
    kvStore: {},

    // [TODO]: Initialize your scenario-specific state
  };
};

export { createInitialState };
