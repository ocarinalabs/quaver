/**
 * Time Tools
 *
 * Simulation time control. The waitForNextHour tool signals
 * the simulation to advance to the next hour.
 */

import { tool } from "ai";
import { z } from "zod";
import type { RideshareState } from "../config/types.js";

/**
 * Wait for the next hour in the simulation.
 * Signals the simulation to advance and process hour transitions.
 */
const waitForNextHourTool = tool({
  description:
    "End the current hour and advance to the next one. Use this when you have completed your tasks for this hour or are waiting for ride requests.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as RideshareState;
    state.waitingForNextHour = true;
    state.waitingForNextStep = true;

    const nextHour = (state.hour + 1) % 24;
    const nextDay = state.hour === 23 ? state.day + 1 : state.day;

    return {
      success: true,
      currentHour: state.hour,
      currentDay: state.day,
      message: `Ending hour ${state.hour}. Advancing to hour ${nextHour}${nextHour < state.hour ? ` (Day ${nextDay})` : ""}...`,
    };
  },
});

export { waitForNextHourTool };
