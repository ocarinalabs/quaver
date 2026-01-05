/**
 * Agent Configuration
 *
 * Tool configuration and agent factory.
 * Supports both in-memory tools (default) and AgentFS (persistent storage).
 */

import { createLogger } from "@quaver/core/logging/logger";
import type { LogPreset } from "@quaver/core/logging/types";
import { agentfsTools } from "@quaver/core/tools/agentfs";
import { helloTool } from "@quaver/core/tools/hello";
import { memoryTools } from "@quaver/core/tools/memory";
import { adjustScoreTool, getScoreTool } from "@quaver/core/tools/score";
import { waitForNextStepTool } from "@quaver/core/tools/time";
import type { BaseState } from "@quaver/core/types/state";
import { AgentFS } from "agentfs-sdk";
import type { Tool } from "ai";
import { hasToolCall, stepCountIs, ToolLoopAgent } from "ai";

const MAX_MESSAGES = 50;
const KEEP_MESSAGES = 40;
const MAX_TOOL_CALLS_PER_STEP = 100;

/**
 * Options for creating an agent.
 */
type CreateAgentOptions = {
  /** Model ID to use (e.g., "anthropic/claude-sonnet-4.5") */
  model: string;
  /** System prompt for the agent */
  system: string;
  /** Initial state (must extend BaseState) */
  state: BaseState;
  /** Additional tools to include */
  tools?: Record<string, Tool>;
  /** Log verbosity (default: "normal") */
  logLevel?: LogPreset;
  /** Use AgentFS for persistent storage */
  useAgentFS?: boolean;
  /** Agent ID for AgentFS */
  agentId?: string;
};

/**
 * Create a new agent with the provided configuration.
 *
 * @param options - Agent configuration options
 * @returns Agent instance and logger
 *
 * @example
 * ```typescript
 * import { createAgent } from "@quaver/core/agent";
 * import { SYSTEM_PROMPT } from "./prompts";
 * import { createInitialState } from "./config/init";
 * import { customTools } from "./tools/custom";
 *
 * const state = createInitialState();
 * const { agent, logger } = await createAgent({
 *   model: "anthropic/claude-sonnet-4.5",
 *   system: SYSTEM_PROMPT,
 *   state,
 *   tools: customTools,
 * });
 * ```
 */
const createAgent = async (options: CreateAgentOptions) => {
  const {
    model,
    system,
    state,
    tools: customTools = {},
    logLevel = "normal",
    useAgentFS = false,
    agentId,
  } = options;

  const logger = createLogger(logLevel);
  const storageTools = useAgentFS ? agentfsTools : memoryTools;

  if (useAgentFS) {
    state.agent = await AgentFS.open({
      id: agentId ?? crypto.randomUUID(),
    });
  }

  const tools = {
    // Core framework tools
    getScore: getScoreTool,
    adjustScore: adjustScoreTool,
    waitForNextStep: waitForNextStepTool,
    ...storageTools,
    hello: helloTool,
    // Custom tools from the benchmark
    ...customTools,
  };

  const agent = new ToolLoopAgent({
    model,
    instructions: system,
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

  return { agent, logger };
};

/** Default framework tools (for reference) */
const frameworkTools = {
  getScore: getScoreTool,
  adjustScore: adjustScoreTool,
  waitForNextStep: waitForNextStepTool,
  ...memoryTools,
  hello: helloTool,
};

export { createAgent, frameworkTools };
export type { CreateAgentOptions };
