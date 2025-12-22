/**
 * Agent Configuration
 *
 * Rideshare driver agent with all tools.
 */

import {
  kvDeleteTool,
  kvGetTool,
  kvListTool,
  kvSetTool,
  readScratchpadTool,
  writeScratchpadTool,
} from "@quaver/core/tools/memory";
import { Experimental_Agent as Agent, hasToolCall, stepCountIs } from "ai";
import { createInitialState } from "../config/init.js";
import { checkEnergyTool, restTool } from "../tools/driver/index.js";
import {
  getCurrentLocationTool,
  getZoneInfoTool,
  goToZoneTool,
} from "../tools/navigation/index.js";
import {
  checkEventsTool,
  goOfflineTool,
  goOnlineTool,
} from "../tools/platform/index.js";
import {
  acceptRideTool,
  completeRideTool,
  declineRideTool,
  startRideTool,
  viewPendingRequestsTool,
} from "../tools/rides/index.js";
import {
  getDriverStatusTool,
  getEarningsTool,
  getVehicleStatusTool,
} from "../tools/status/index.js";
import { waitForNextHourTool } from "../tools/time.js";
import {
  getGasPricesTool,
  refuelTool,
  scheduleMaintenanceTool,
} from "../tools/vehicle/index.js";
import { SYSTEM_PROMPT } from "./prompts.js";

/**
 * All tools available to the rideshare driver agent.
 */
const tools = {
  // Status tools
  getDriverStatus: getDriverStatusTool,
  getVehicleStatus: getVehicleStatusTool,
  getEarnings: getEarningsTool,

  // Navigation tools
  getCurrentLocation: getCurrentLocationTool,
  getZoneInfo: getZoneInfoTool,
  goToZone: goToZoneTool,

  // Platform tools
  goOnline: goOnlineTool,
  goOffline: goOfflineTool,
  checkEvents: checkEventsTool,

  // Ride tools
  viewPendingRequests: viewPendingRequestsTool,
  acceptRide: acceptRideTool,
  declineRide: declineRideTool,
  startRide: startRideTool,
  completeRide: completeRideTool,

  // Vehicle tools
  refuel: refuelTool,
  getGasPrices: getGasPricesTool,
  scheduleMaintenance: scheduleMaintenanceTool,

  // Memory tools (from @quaver/core)
  readScratchpad: readScratchpadTool,
  writeScratchpad: writeScratchpadTool,
  kvGet: kvGetTool,
  kvSet: kvSetTool,
  kvDelete: kvDeleteTool,
  kvList: kvListTool,

  // Time control
  waitForNextHour: waitForNextHourTool,

  // Driver self-management
  checkEnergy: checkEnergyTool,
  rest: restTool,
};

/** Maximum messages before context trimming */
const MAX_MESSAGES = 50;

/** Keep recent messages after trimming */
const KEEP_MESSAGES = 40;

/** Maximum tool calls per step */
const MAX_TOOL_CALLS_PER_STEP = 100;

/**
 * Create a new rideshare agent with fresh state.
 */
const createRideshareAgent = (model = "anthropic/claude-sonnet-4.5") => {
  const state = createInitialState();

  const agent = new Agent({
    model,
    system: SYSTEM_PROMPT,
    tools,
    experimental_context: state,
    stopWhen: [
      hasToolCall("waitForNextHour"),
      stepCountIs(MAX_TOOL_CALLS_PER_STEP),
    ],

    prepareStep: ({ messages }) => {
      if (messages.length > MAX_MESSAGES) {
        const systemMessage = messages[0];
        const recentMessages = messages.slice(-KEEP_MESSAGES);
        if (systemMessage) {
          return { messages: [systemMessage, ...recentMessages] };
        }
      }
      return {};
    },

    onStepFinish: ({ toolCalls, usage }) => {
      if (toolCalls.length > 0) {
        const toolNames = toolCalls.map((tc) => tc.toolName).join(", ");
        console.log(`[Step ${state.step}] Tools: ${toolNames}`);
      }
      if (usage) {
        console.log(
          `[Step ${state.step}] Tokens: ${usage.inputTokens} in / ${usage.outputTokens} out`
        );
      }
    },
  });

  return { agent, state };
};

export { createRideshareAgent, tools };
