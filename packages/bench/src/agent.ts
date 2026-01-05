/**
 * Agent Creation
 *
 * This file demonstrates how to create agents for your benchmark.
 * It uses @quaver/core's createAgent factory and combines framework tools
 * with your custom tools.
 *
 * The quaver agent should look at this file to understand:
 * 1. How to import from @quaver/core
 * 2. How to create agents with custom tools
 * 3. How to configure agent options
 *
 * For more details on @quaver/core, the agent can look at:
 * - node_modules/@quaver/core/dist/*.d.ts (type definitions)
 * - node_modules/@quaver/core/package.json (available exports)
 */

import type { CreateAgentOptions } from "@quaver/core/agent";
import { createAgent } from "@quaver/core/agent";
import { memoryTools } from "@quaver/core/tools/memory";
import { adjustScoreTool, getScoreTool } from "@quaver/core/tools/score";
import { waitForNextStepTool } from "@quaver/core/tools/time";
import { createInitialState } from "./config/init.js";
import type { YourBenchmarkState } from "./config/types.js";
import { SYSTEM_PROMPT } from "./prompts.js";
import { customTools } from "./tools/custom.js";

/**
 * Framework tools from @quaver/core.
 *
 * These are always available and work with any BaseState:
 * - getScore: Get current score and event history
 * - adjustScore: Modify score with reason
 * - waitForNextStep: Signal step completion
 * - readScratchpad/writeScratchpad: Free-form notes
 * - kvGet/kvSet/kvDelete/kvList: Key-value storage
 */
export const frameworkTools = {
  getScore: getScoreTool,
  adjustScore: adjustScoreTool,
  waitForNextStep: waitForNextStepTool,
  ...memoryTools,
};

/**
 * All tools for this benchmark.
 *
 * Combines framework tools with your custom domain-specific tools.
 */
export const allTools = {
  ...frameworkTools,
  ...customTools,
};

/**
 * Create a benchmark agent with default configuration.
 *
 * This is the simplest way to create an agent. It uses:
 * - The system prompt from prompts.ts
 * - Initial state from config/init.ts
 * - All framework + custom tools
 *
 * @param model - Model ID (e.g., "anthropic/claude-sonnet-4.5")
 * @returns Agent instance and logger
 *
 * @example
 * ```typescript
 * const { agent, logger } = await createBenchmarkAgent();
 *
 * // Run the agent
 * await agent.generate({ prompt: "Begin the simulation..." });
 * ```
 */
export async function createBenchmarkAgent(
  model = "anthropic/claude-sonnet-4.5"
) {
  const state = createInitialState();

  const { agent, logger } = await createAgent({
    model,
    system: SYSTEM_PROMPT,
    state,
    tools: customTools,
  });

  return { agent, state, logger };
}

/**
 * Create a benchmark agent with custom options.
 *
 * Use this for more control over agent configuration.
 *
 * @param options - Agent configuration options
 * @returns Agent instance and logger
 *
 * @example
 * ```typescript
 * const state = createInitialState();
 * state.balance = 50000; // Custom starting balance
 *
 * const { agent, logger } = await createCustomAgent({
 *   model: "openai/gpt-4o",
 *   system: MY_CUSTOM_PROMPT,
 *   state,
 *   tools: { ...customTools, myExtraTool },
 *   logLevel: "verbose",
 * });
 * ```
 */
export async function createCustomAgent(
  options: Omit<CreateAgentOptions, "state"> & { state: YourBenchmarkState }
) {
  return await createAgent(options);
}

/**
 * Create multiple agents for multi-agent benchmarks.
 *
 * Each agent gets its own state and can have different configurations.
 * Useful for adversarial scenarios, cooperation tests, etc.
 *
 * @example
 * ```typescript
 * const agents = await createMultipleAgents([
 *   {
 *     name: "buyer",
 *     model: "anthropic/claude-sonnet-4.5",
 *     system: BUYER_PROMPT,
 *     initialBalance: 10000,
 *   },
 *   {
 *     name: "seller",
 *     model: "openai/gpt-4o",
 *     system: SELLER_PROMPT,
 *     initialBalance: 0,
 *   },
 * ]);
 *
 * // Run agents in turns
 * for (const { agent, state } of agents) {
 *   await agent.generate({ prompt: `Your turn...` });
 * }
 * ```
 */
export async function createMultipleAgents(
  configs: Array<{
    name: string;
    model?: string;
    system: string;
    stateOverrides?: Partial<YourBenchmarkState>;
  }>
) {
  const agents = await Promise.all(
    configs.map(async (config) => {
      const state = createInitialState();

      // Apply state overrides
      if (config.stateOverrides) {
        Object.assign(state, config.stateOverrides);
      }

      const { agent, logger } = await createAgent({
        model: config.model ?? "anthropic/claude-sonnet-4.5",
        system: config.system,
        state,
        tools: customTools,
      });

      return {
        name: config.name,
        agent,
        state,
        logger,
      };
    })
  );

  return agents;
}

// For convenience, users can also import directly from @quaver/core:
// import { createAgent } from "@quaver/core/agent";
// import { createLogger } from "@quaver/core/logging/logger";
// import type { CreateAgentOptions } from "@quaver/core/agent";
// import type { BaseState } from "@quaver/core/types/state";
