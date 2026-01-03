/**
 * Score Tools
 *
 * Score operations: check score and adjust it.
 */

import type { BaseState } from "@quaver/core/types/state";
import { tool } from "ai";
import { z } from "zod";

const getScoreTool = tool({
  description:
    "Get your current score and recent event history. Use this to check your progress.",
  inputSchema: z.object({
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Number of recent events to return"),
  }),
  strict: true,
  execute: ({ limit }, { experimental_context }) => {
    const state = experimental_context as BaseState;
    const recentEvents = state.events.slice(-limit);

    return {
      score: state.score,
      events: recentEvents.map((e) => ({
        id: e.id,
        type: e.type,
        delta: e.delta,
        description: e.description,
        timestamp: e.timestamp.toISOString(),
      })),
    };
  },
});

const adjustScoreTool = tool({
  description:
    "Adjust the score by a given amount. Positive values increase score, negative values decrease it.",
  inputSchema: z.object({
    delta: z
      .number()
      .describe("Amount to adjust score by (positive or negative)"),
    reason: z.string().describe("Reason for the adjustment"),
    type: z
      .enum(["cost", "reward", "penalty"])
      .describe("Type of score adjustment"),
  }),
  strict: true,
  execute: ({ delta, reason, type }, { experimental_context }) => {
    const state = experimental_context as BaseState;

    state.score += delta;
    state.events.push({
      id: crypto.randomUUID(),
      type,
      delta,
      description: reason,
      timestamp: new Date(),
    });

    return {
      success: true,
      message: `Score adjusted by ${delta >= 0 ? "+" : ""}${delta}: ${reason}`,
      newScore: state.score,
    };
  },
});

export { adjustScoreTool, getScoreTool };
