/**
 * Analyzer Tools
 *
 * Programmatic extraction tools for the analyzer agent.
 * Uses experimental_context to access AnalyzerState, just like
 * memory.ts and score.ts access BaseState.
 */

import type {
  BenchmarkLogEntry,
  StartLog,
  ToolLog,
} from "@quaver/core/logging/schemas";
import { tool } from "ai";
import { z } from "zod";
import type { Finding } from "./types.js";

/**
 * State for the analyzer agent.
 * Passed via experimental_context, just like BaseState.
 */
export type AnalyzerState = {
  logs: BenchmarkLogEntry[];
  filePath: string;
  findings: Finding[];
};

/**
 * Tool usage statistics.
 */
export type ToolUsage = {
  tool: string;
  count: number;
  percentage: number;
};

/**
 * Get tool usage statistics.
 * Counts how many times each tool was called.
 */
const getToolUsageTool = tool({
  description:
    "Get statistics on which tools were used and how often during the benchmark.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as AnalyzerState;
    const toolLogs = state.logs.filter((l): l is ToolLog => l.type === "tool");
    const counts = new Map<string, number>();

    for (const t of toolLogs) {
      counts.set(t.tool, (counts.get(t.tool) ?? 0) + 1);
    }

    const total = toolLogs.length;
    const usage: ToolUsage[] = Array.from(counts.entries())
      .map(([name, count]) => ({
        tool: name,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      tools: usage,
    };
  },
});

/**
 * Get benchmark duration.
 * Calculates time between start and end markers.
 */
const getDurationTool = tool({
  description: "Get the total duration of the benchmark run in seconds.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as AnalyzerState;
    const start = state.logs.find((l) => l.type === "start");
    const end = state.logs.find((l) => l.type === "end");

    if (!(start && end)) {
      return { duration: 0, error: "Missing start or end markers" };
    }

    const ms = new Date(end.time).getTime() - new Date(start.time).getTime();
    return {
      duration: ms / 1000,
      startTime: start.time,
      endTime: end.time,
    };
  },
});

/**
 * Get thinking blocks.
 * Extracts all reasoning/thinking text from the agent.
 */
const getThinkingTool = tool({
  description:
    "Extract thinking/reasoning blocks from the agent. Use this to understand the agent's decision process.",
  inputSchema: z.object({
    limit: z
      .number()
      .optional()
      .default(20)
      .describe("Maximum number of thinking blocks to return"),
  }),
  execute: ({ limit }, { experimental_context }) => {
    const state = experimental_context as AnalyzerState;
    const thinking = state.logs
      .filter((l) => l.type === "thinking")
      .map((l) => l.msg)
      .slice(0, limit);

    return {
      count: thinking.length,
      samples: thinking,
    };
  },
});

/**
 * Get event timeline.
 * Returns a chronological list of events.
 */
const getTimelineTool = tool({
  description: "Get a timeline of events. Optionally filter by event type.",
  inputSchema: z.object({
    types: z
      .array(z.string())
      .optional()
      .describe("Filter by event types (e.g., ['tool', 'transition'])"),
    limit: z
      .number()
      .optional()
      .default(50)
      .describe("Maximum events to return"),
  }),
  execute: ({ types, limit }, { experimental_context }) => {
    const state = experimental_context as AnalyzerState;
    let logs = state.logs;

    if (types?.length) {
      logs = logs.filter((l) => types.includes(l.type));
    }

    return logs.slice(0, limit).map((l) => ({
      time: l.time,
      type: l.type,
      message: l.msg,
    }));
  },
});

/**
 * Get summary statistics.
 * Returns overall benchmark metrics.
 */
const getSummaryTool = tool({
  description: "Get overall summary statistics for the benchmark run.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as AnalyzerState;
    const startLog = state.logs.find((l): l is StartLog => l.type === "start");
    const endLog = state.logs.find((l) => l.type === "end");

    const duration =
      startLog && endLog
        ? (new Date(endLog.time).getTime() -
            new Date(startLog.time).getTime()) /
          1000
        : 0;

    return {
      filePath: state.filePath,
      benchmark: startLog?.benchmark ?? "unknown",
      model: startLog?.model ?? "unknown",
      duration,
      totalEntries: state.logs.length,
      thinkingCount: state.logs.filter((l) => l.type === "thinking").length,
      toolCallCount: state.logs.filter((l) => l.type === "tool").length,
      transitionCount: state.logs.filter((l) => l.type === "transition").length,
    };
  },
});

/**
 * Search logs for a pattern.
 * Finds entries matching a text pattern.
 */
const searchLogsTool = tool({
  description:
    "Search log entries for a text pattern. Returns matching entries.",
  inputSchema: z.object({
    pattern: z
      .string()
      .describe("Text pattern to search for (case-insensitive)"),
    limit: z
      .number()
      .optional()
      .default(20)
      .describe("Maximum results to return"),
  }),
  execute: ({ pattern, limit }, { experimental_context }) => {
    const state = experimental_context as AnalyzerState;
    const lowerPattern = pattern.toLowerCase();

    const matches = state.logs
      .filter((l) => l.msg.toLowerCase().includes(lowerPattern))
      .slice(0, limit)
      .map((l) => ({
        time: l.time,
        type: l.type,
        message: l.msg,
      }));

    return {
      pattern,
      matchCount: matches.length,
      matches,
    };
  },
});

/**
 * Record a finding during evaluation.
 * Used by the analyzer agent to record violations, strengths, weaknesses.
 */
const recordFindingTool = tool({
  description:
    "Record a finding (violation, strength, weakness, or observation) discovered during analysis.",
  inputSchema: z.object({
    type: z.enum(["violation", "strength", "weakness", "observation"]),
    severity: z
      .enum(["info", "warning", "error", "critical"])
      .optional()
      .describe("Severity level (for violations)"),
    category: z
      .string()
      .describe("Category: safety, efficiency, decision-quality, etc."),
    description: z.string().describe("Clear description of the finding"),
    step: z.number().optional().describe("Step number if applicable"),
    evidence: z.string().optional().describe("Supporting evidence from logs"),
  }),
  execute: (finding, { experimental_context }) => {
    const state = experimental_context as AnalyzerState;
    state.findings.push(finding as Finding);
    return { recorded: true, totalFindings: state.findings.length };
  },
});

/**
 * All analyzer tools.
 */
export const analyzerTools = {
  // Extraction tools
  getToolUsage: getToolUsageTool,
  getDuration: getDurationTool,
  getThinking: getThinkingTool,
  getTimeline: getTimelineTool,
  getSummary: getSummaryTool,
  searchLogs: searchLogsTool,
  // Recording tool
  recordFinding: recordFindingTool,
};

export {
  getToolUsageTool,
  getDurationTool,
  getThinkingTool,
  getTimelineTool,
  getSummaryTool,
  searchLogsTool,
  recordFindingTool,
};
