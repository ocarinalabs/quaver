/**
 * Vending-Bench Agent
 *
 * AI SDK Agent configured with all tools and VB2 system prompt.
 * Uses experimental_context to pass VendingState to tools.
 *
 * Loop control:
 * - stopWhen: hasToolCall("waitForNextDay") - pauses for simulation advancement
 * - prepareStep: context management for long-running simulations
 * - onStepFinish: advances worker executions in parallel
 */

import { Experimental_Agent as Agent, hasToolCall, stepCountIs } from "ai";
import { SYSTEM_PROMPT } from "./config/prompts.js";
import { createInitialState } from "./core/state.js";
import { advanceWorkerExecutions } from "./simulation/worker-execution.js";
import { getBalanceTool, makePaymentTool } from "./tools/general/balance.js";
import {
  readEmailsTool,
  replyEmailTool,
  sendEmailTool,
} from "./tools/general/email.js";
import { searchTool } from "./tools/general/search.js";
import { collectCashTool } from "./tools/machine/cash.js";
import {
  getMachineInventoryTool,
  getStorageInventoryTool,
  restockMachineTool,
} from "./tools/machine/inventory.js";
import { setPriceTool } from "./tools/machine/pricing.js";
import {
  kvDeleteTool,
  kvGetTool,
  kvListTool,
  kvSetTool,
  readScratchpadTool,
  writeScratchpadTool,
} from "./tools/memory.js";
import { waitForNextDayTool } from "./tools/time.js";
import {
  approveWorkerActionTool,
  assignTaskTool,
  checkWorkerStatusTool,
  denyWorkerActionTool,
  fireWorkerTool,
  getWorkerReportTool,
  hireWorkerTool,
  listAvailableWorkersTool,
  messageWorkerTool,
  readWorkerMessagesTool,
} from "./tools/workers/index.js";

/**
 * All tools available to the agent
 */
const tools = {
  // General/Remote tools
  getBalance: getBalanceTool,
  makePayment: makePaymentTool,
  readEmails: readEmailsTool,
  sendEmail: sendEmailTool,
  replyEmail: replyEmailTool,
  search: searchTool,

  // Machine tools
  collectCash: collectCashTool,
  getStorageInventory: getStorageInventoryTool,
  getMachineInventory: getMachineInventoryTool,
  restockMachine: restockMachineTool,
  setPrice: setPriceTool,

  // Memory tools
  readScratchpad: readScratchpadTool,
  writeScratchpad: writeScratchpadTool,
  kvGet: kvGetTool,
  kvSet: kvSetTool,
  kvDelete: kvDeleteTool,
  kvList: kvListTool,

  // Time tools
  waitForNextDay: waitForNextDayTool,

  // Worker Marketplace tools
  listAvailableWorkers: listAvailableWorkersTool,
  hireWorker: hireWorkerTool,
  fireWorker: fireWorkerTool,
  assignTask: assignTaskTool,
  checkWorkerStatus: checkWorkerStatusTool,
  getWorkerReport: getWorkerReportTool,
  approveWorkerAction: approveWorkerActionTool,
  denyWorkerAction: denyWorkerActionTool,
  messageWorker: messageWorkerTool,
  readWorkerMessages: readWorkerMessagesTool,
};

/** Maximum messages before context trimming (paper: ~30k tokens) */
const MAX_MESSAGES = 50;

/** Messages to keep after trimming */
const KEEP_MESSAGES = 40;

/** Maximum steps per agent.generate() call */
const MAX_STEPS_PER_DAY = 100;

/**
 * Create a new Vending-Bench agent with fresh state
 *
 * The agent stops when:
 * 1. waitForNextDay is called (day boundary)
 * 2. MAX_STEPS_PER_DAY reached (safety limit)
 *
 * Usage:
 * ```ts
 * const { agent, state } = createVendingAgent();
 * let result = await agent.generate({ prompt: "Begin managing..." });
 *
 * while (!isBankrupt(state) && state.day <= 365) {
 *   advanceDay(state); // Run simulation
 *   result = await agent.generate({ prompt: "Continue..." });
 * }
 * ```
 */
export const createVendingAgent = (model = "anthropic/claude-sonnet-4.5") => {
  const state = createInitialState();

  const agent = new Agent({
    model,
    system: SYSTEM_PROMPT,
    tools,
    experimental_context: state,

    // Stop when day ends OR safety limit reached
    stopWhen: [hasToolCall("waitForNextDay"), stepCountIs(MAX_STEPS_PER_DAY)],

    // Context management for long-running simulations
    prepareStep: ({ messages }) => {
      if (messages.length > MAX_MESSAGES) {
        const systemMessage = messages[0];
        const recentMessages = messages.slice(-KEEP_MESSAGES);
        if (systemMessage) {
          return {
            messages: [systemMessage, ...recentMessages],
          };
        }
      }
      return {};
    },

    // Observability and worker parallel execution hook
    onStepFinish: async ({ toolCalls, usage }) => {
      if (toolCalls.length > 0) {
        const toolNames = toolCalls.map((tc) => tc.toolName).join(", ");
        console.log(`[Day ${state.day}] Tools: ${toolNames}`);
      }
      if (usage) {
        console.log(
          `[Day ${state.day}] Tokens: ${usage.inputTokens} in / ${usage.outputTokens} out`
        );
      }

      // Advance worker executions in parallel with main agent
      await advanceWorkerExecutions(state);
    },
  });

  return { agent, state };
};

export { tools };
