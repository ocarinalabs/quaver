/**
 * Time Tools
 *
 * Simulation time control. The waitForNextStep tool signals
 * the simulation to advance to the next step.
 */

import type { BaseState } from "@quaver/core/types/state";
import { tool } from "ai";
import { z } from "zod";

/**
 * Wait for the next step in the simulation.
 * Signals the simulation to advance and process step transitions.
 */
const waitForNextStepTool = tool({
  description:
    "End the current step and advance to the next one. Use this when you have completed your tasks for this step.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as BaseState;
    state.waitingForNextStep = true;

    return {
      success: true,
      currentStep: state.step,
      message: `Ending step ${state.step}. Advancing to next step...`,
    };
  },
});

export { waitForNextStepTool };
