/**
 * Custom Tools
 *
 * Scenario-specific tools for your benchmark.
 *
 * [TODO]: Rename this file (e.g., inventory.ts, tasks.ts)
 * [TODO]: Replace placeholder tools with your scenario tools
 *
 * Tool Pattern:
 * 1. Import tool() from "ai" and z from "zod"
 * 2. Import your state type (extends BaseState)
 * 3. Define inputSchema with Zod validation
 * 4. Implement execute function
 * 5. Access state via experimental_context
 * 6. Return structured result
 */

import { tool } from "ai";
import { z } from "zod";
import type { YourBenchmarkState } from "../config/types.js";

// ============================================================================
// TOOL 1: Read-only tool (queries state)
// ============================================================================

/**
 * [TODO]: Rename and customize this read-only tool.
 *
 * Read-only tools query state without modifying it.
 */
const getYourDataTool = tool({
  description:
    "[TODO]: Describe what this tool does. Be specific about what it returns.",
  inputSchema: z.object({
    filter: z.string().optional().describe("Optional filter to apply"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum items to return"),
  }),
  strict: true,
  execute: ({ filter: _filter, limit: _limit }, { experimental_context }) => {
    const _state = experimental_context as YourBenchmarkState;

    // [TODO]: Implement your read logic

    return {
      success: true,
      message: "Data retrieved",
    };
  },
});

// ============================================================================
// TOOL 2: Write tool (modifies state)
// ============================================================================

/**
 * [TODO]: Rename and customize this write tool.
 *
 * Write tools modify state. Always:
 * - Validate inputs
 * - Check preconditions
 * - Update state
 * - Record events if needed
 * - Return confirmation
 */
const doYourActionTool = tool({
  description: "[TODO]: Describe the action. Note if it's irreversible.",
  inputSchema: z.object({
    itemId: z.string().describe("ID of the item to act on"),
    amount: z.number().positive().describe("Amount for the action"),
  }),
  strict: true,
  execute: ({ itemId, amount: _amount }, { experimental_context }) => {
    const _state = experimental_context as YourBenchmarkState;

    // [TODO]: Validate preconditions
    // [TODO]: Perform the action
    // [TODO]: Record event if needed

    return {
      success: true,
      message: `Action completed on ${itemId}`,
    };
  },
});

// ============================================================================
// TOOL 3: Async tool (external API, LLM call, etc.)
// ============================================================================

/**
 * [TODO]: Rename and customize this async tool.
 *
 * Async tools can make external calls.
 */
const fetchExternalDataTool = tool({
  description: "[TODO]: Describe the external operation.",
  inputSchema: z.object({
    query: z.string().describe("Query to send to external service"),
  }),
  strict: true,
  execute: async ({ query }, { experimental_context }) => {
    const _state = experimental_context as YourBenchmarkState;

    // [TODO]: Implement your async logic
    // Example: await fetch("https://api.example.com/data")
    await Promise.resolve(); // Placeholder for async operation

    return {
      success: true,
      query,
      results: [],
    };
  },
});

/** Export all custom tools */
export const customTools = {
  getYourData: getYourDataTool,
  doYourAction: doYourActionTool,
  fetchExternalData: fetchExternalDataTool,
};

export { doYourActionTool, fetchExternalDataTool, getYourDataTool };
