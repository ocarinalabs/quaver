/**
 * Time Tools - Simulation time control
 *
 * Paper reference (line 128): "the agent can also choose to let time pass
 * with the `wait_for_next_day` tool"
 * Paper reference (line 129-130): "Every morning, the agent is notified of
 * what items were purchased, and if any new email has been received."
 */

import type { VendingState } from "@vending/core/types.js";
import { tool } from "ai";
import { z } from "zod";

/**
 * Wait for the next day in the simulation
 *
 * Signals the simulation to advance to the next day.
 * The simulation will process overnight events (sales, emails, fees).
 */
export const waitForNextDayTool = tool({
  description:
    "End the current day and wait for the next morning. Use this when you have completed your daily tasks. Overnight, customers will make purchases, emails may arrive, and the daily fee will be charged.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as VendingState;

    state.waitingForNextDay = true;

    return {
      success: true,
      currentDay: state.day,
      message: `Ending day ${state.day}. Waiting for next morning...`,
    };
  },
});
