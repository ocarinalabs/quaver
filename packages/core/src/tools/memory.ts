/**
 * Memory Tools
 *
 * Persistent storage tools for agents: scratchpad and key-value store.
 * These tools use experimental_context to access state.
 */

import type { BaseState } from "@quaver/core/types/state";
import { tool } from "ai";
import { z } from "zod";

/**
 * Read the scratchpad contents.
 * Free-form text storage for notes, plans, and summaries.
 */
const readScratchpadTool = tool({
  description:
    "Read your scratchpad notes. The scratchpad is free-form text storage for keeping track of plans, summaries, contacts, and other important information.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as BaseState;
    return {
      content: state.scratchpad,
      length: state.scratchpad.length,
    };
  },
});

/**
 * Write to the scratchpad.
 * Overwrites or appends to existing content.
 */
const writeScratchpadTool = tool({
  description:
    "Write to your scratchpad. You can overwrite the entire contents or append to existing notes. Use this to keep track of daily summaries, important information, strategies, and other data.",
  inputSchema: z.object({
    content: z.string().describe("The text to write to the scratchpad"),
    append: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, append to existing content instead of overwriting"),
  }),
  execute: ({ content, append }, { experimental_context }) => {
    const state = experimental_context as BaseState;

    if (append) {
      state.scratchpad += content;
    } else {
      state.scratchpad = content;
    }

    return {
      success: true,
      message: append ? "Content appended to scratchpad" : "Scratchpad updated",
      newLength: state.scratchpad.length,
    };
  },
});

/**
 * Get a value from the key-value store.
 */
const kvGetTool = tool({
  description:
    "Retrieve a value from the key-value store by its key. Use this to store and retrieve structured data like contacts, costs, or configuration values.",
  inputSchema: z.object({
    key: z.string().describe("The key to look up"),
  }),
  execute: ({ key }, { experimental_context }) => {
    const state = experimental_context as BaseState;
    const value = state.kvStore[key];

    if (value === undefined) {
      return {
        found: false,
        key,
        value: null,
      };
    }

    return {
      found: true,
      key,
      value,
    };
  },
});

/**
 * Set a value in the key-value store.
 */
const kvSetTool = tool({
  description:
    "Store a value in the key-value store. Values are stored as strings. Use this for structured data that needs to be retrieved by specific keys.",
  inputSchema: z.object({
    key: z.string().describe("The key to store the value under"),
    value: z.string().describe("The value to store"),
  }),
  execute: ({ key, value }, { experimental_context }) => {
    const state = experimental_context as BaseState;
    const existed = key in state.kvStore;
    state.kvStore[key] = value;

    return {
      success: true,
      key,
      overwritten: existed,
      message: existed ? `Updated key "${key}"` : `Created key "${key}"`,
    };
  },
});

/**
 * Delete a key from the key-value store.
 */
const kvDeleteTool = tool({
  description: "Delete a key from the key-value store.",
  inputSchema: z.object({
    key: z.string().describe("The key to delete"),
  }),
  execute: ({ key }, { experimental_context }) => {
    const state = experimental_context as BaseState;
    const existed = key in state.kvStore;

    if (existed) {
      delete state.kvStore[key];
    }

    return {
      success: existed,
      key,
      message: existed ? `Deleted key "${key}"` : `Key "${key}" not found`,
    };
  },
});

/**
 * List all keys in the key-value store.
 */
const kvListTool = tool({
  description: "List all keys currently stored in the key-value store.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as BaseState;
    const keys = Object.keys(state.kvStore);

    return {
      keys,
      count: keys.length,
    };
  },
});

export {
  readScratchpadTool,
  writeScratchpadTool,
  kvGetTool,
  kvSetTool,
  kvDeleteTool,
  kvListTool,
};
