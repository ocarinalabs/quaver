/**
 * Agent Configuration
 *
 * Tool configuration and agent factory.
 *
 * [TODO]: Add your scenario-specific tools
 */

import { createInitialState } from "@quaver/core/config/init";
import { createLogger } from "@quaver/core/logging/logger";
import type { LogPreset } from "@quaver/core/logging/types";
import { agentfsTools } from "@quaver/core/tools/agentfs";
import { helloTool } from "@quaver/core/tools/hello";
// import {
//   kvDeleteTool,
//   kvGetTool,
//   kvListTool,
//   kvSetTool,
//   readScratchpadTool,
//   writeScratchpadTool,
// } from "@quaver/core/tools/memory";
import { adjustScoreTool, getScoreTool } from "@quaver/core/tools/score";
import { waitForNextStepTool } from "@quaver/core/tools/time";
import { Experimental_Agent as Agent, hasToolCall, stepCountIs } from "ai";
import { SYSTEM_PROMPT } from "./prompts.js";

/**
 * All tools available to the agent.
 * [TODO]: Add your scenario-specific tools.
 */
const tools = {
  // Core tools
  getScore: getScoreTool,
  adjustScore: adjustScoreTool,
  waitForNextStep: waitForNextStepTool,

  // AgentFS tools (persistent storage)
  ...agentfsTools,

  // Example tool
  hello: helloTool,

  // [TODO]: Add your scenario-specific tools

  // Legacy in-memory tools (commented out, replaced by agentfsTools)
  // readScratchpad: readScratchpadTool,
  // writeScratchpad: writeScratchpadTool,
  // kvGet: kvGetTool,
  // kvSet: kvSetTool,
  // kvDelete: kvDeleteTool,
  // kvList: kvListTool,
};

/** Maximum messages before context trimming */
const MAX_MESSAGES = 50;

/** Messages to keep after trimming */
const KEEP_MESSAGES = 40;

/** Maximum tool calls per step */
const MAX_TOOL_CALLS_PER_STEP = 100;

/**
 * Create a new agent with fresh state and automatic logging.
 *
 * @param model - Model ID to use
 * @param logLevel - Log verbosity (default: "normal")
 * @returns Agent instance, state, and logger
 */
const createAgent = (
  model = "openai/gpt-5.2",
  logLevel: LogPreset = "normal"
) => {
  const state = createInitialState();
  const logger = createLogger(logLevel);

  const agent = new Agent({
    model,
    system: SYSTEM_PROMPT,
    tools,
    experimental_context: state,
    stopWhen: [
      hasToolCall("waitForNextStep"),
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

    onStepFinish: logger.createStepHook(),
  });

  return { agent, state, logger };
};

export { createAgent, tools };
