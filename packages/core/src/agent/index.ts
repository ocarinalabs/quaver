/**
 * Agent Configuration
 *
 * Tool configuration and agent factory.
 * Supports both in-memory tools (default) and AgentFS (persistent storage).
 */

import { createInitialState } from "@quaver/core/config/init";
import { createLogger } from "@quaver/core/logging/logger";
import type { LogPreset } from "@quaver/core/logging/types";
import { agentfsTools } from "@quaver/core/tools/agentfs";
import { helloTool } from "@quaver/core/tools/hello";
import { memoryTools } from "@quaver/core/tools/memory";
import { adjustScoreTool, getScoreTool } from "@quaver/core/tools/score";
import { waitForNextStepTool } from "@quaver/core/tools/time";
import { AgentFS } from "agentfs-sdk";
import { hasToolCall, stepCountIs, ToolLoopAgent } from "ai";
import { SYSTEM_PROMPT } from "./prompts.js";

const MAX_MESSAGES = 50;
const KEEP_MESSAGES = 40;
const MAX_TOOL_CALLS_PER_STEP = 100;

/**
 * Create a new agent with fresh state and automatic logging.
 *
 * @param model - Model ID to use
 * @param logLevel - Log verbosity (default: "normal")
 * @param options - Agent options (useAgentFS, agentId)
 * @returns Agent instance, state, and logger
 *
 * @example
 * // Default: in-memory tools (safe, no external deps)
 * const { agent } = await createAgent("google/gemini-3-flash");
 *
 * @example
 * // With AgentFS persistent storage
 * const { agent } = await createAgent("google/gemini-3-flash", "normal", {
 *   useAgentFS: true,
 *   agentId: "my-benchmark"
 * });
 */
const createAgent = async (
  model = "openai/gpt-5.2",
  logLevel: LogPreset = "normal",
  options: { useAgentFS?: boolean; agentId?: string } = {}
) => {
  const { useAgentFS = false, agentId } = options;
  const state = createInitialState();
  const logger = createLogger(logLevel);

  const storageTools = useAgentFS ? agentfsTools : memoryTools;

  if (useAgentFS) {
    state.agent = await AgentFS.open({
      id: agentId ?? crypto.randomUUID(),
    });
  }

  const tools = {
    getScore: getScoreTool,
    adjustScore: adjustScoreTool,
    waitForNextStep: waitForNextStepTool,
    ...storageTools,
    hello: helloTool,
  };

  const agent = new ToolLoopAgent({
    model,
    instructions: SYSTEM_PROMPT,
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

const tools = {
  getScore: getScoreTool,
  adjustScore: adjustScoreTool,
  waitForNextStep: waitForNextStepTool,
  ...memoryTools,
  hello: helloTool,
};

export { createAgent, tools };
