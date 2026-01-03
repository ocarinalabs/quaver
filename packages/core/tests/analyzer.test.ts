/**
 * Analyzer Tests
 *
 * Tests for src/analyzer/ (db-loader, analyze, tools)
 */

import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { analyzeQuickFromDb } from "../src/analyzer/analyze";
import {
  getRunMetadata,
  listRuns,
  loadLogsFromDb,
} from "../src/analyzer/db-loader";
import {
  type AnalyzerState,
  getDurationTool,
  getSummaryTool,
  getThinkingTool,
  getTimelineTool,
  getToolUsageTool,
  recordFindingTool,
  searchLogsTool,
} from "../src/analyzer/tools";
import { completeRun, insertRun, insertStep } from "../src/db/queries";
import { initSchema } from "../src/db/schema";
import type { BenchmarkLogEntry } from "../src/logging/schemas";

describe("analyzer", () => {
  describe("db-loader", () => {
    const TEST_RUN_ID = `analyzer-dbloader-${Date.now()}`;

    beforeAll(async () => {
      await initSchema();
      await insertRun({
        id: TEST_RUN_ID,
        benchmark: "analyzer-unit-test",
        model: "test-model",
      });
      await insertStep({
        runId: TEST_RUN_ID,
        stepNumber: 1,
        type: "start",
        data: { benchmark: "analyzer-unit-test", model: "test-model" },
      });
      await insertStep({
        runId: TEST_RUN_ID,
        stepNumber: 2,
        type: "thinking",
        data: { msg: "Test thinking content" },
      });
      await insertStep({
        runId: TEST_RUN_ID,
        stepNumber: 3,
        type: "end",
        data: { finalScore: 100 },
      });
      await completeRun(TEST_RUN_ID, 100);
    });

    describe("loadLogsFromDb", () => {
      test("returns empty array for non-existent run", async () => {
        const logs = await loadLogsFromDb("non-existent-run-id-12345");
        expect(logs).toEqual([]);
      });

      test("loads logs for existing run", async () => {
        const logs = await loadLogsFromDb(TEST_RUN_ID);
        expect(logs.length).toBeGreaterThan(0);
      });

      test("returns correct number of logs", async () => {
        const logs = await loadLogsFromDb(TEST_RUN_ID);
        expect(logs.length).toBe(3);
      });

      test("first log is start type", async () => {
        const logs = await loadLogsFromDb(TEST_RUN_ID);
        expect(logs[0]?.type).toBe("start");
      });

      test("last log is end type", async () => {
        const logs = await loadLogsFromDb(TEST_RUN_ID);
        expect(logs.at(-1)?.type).toBe("end");
      });

      test("logs contain parsed data", async () => {
        const logs = await loadLogsFromDb(TEST_RUN_ID);
        const startLog = logs.find((l) => l.type === "start");
        expect(startLog?.benchmark).toBe("analyzer-unit-test");
      });

      test("logs have time field", async () => {
        const logs = await loadLogsFromDb(TEST_RUN_ID);
        expect(logs[0]?.time).toBeDefined();
      });
    });

    describe("listRuns", () => {
      test("returns array", async () => {
        const runs = await listRuns(10);
        expect(Array.isArray(runs)).toBe(true);
      });

      test("respects limit parameter", async () => {
        const runs = await listRuns(1);
        expect(runs.length).toBeLessThanOrEqual(1);
      });

      test("includes test run", async () => {
        const runs = await listRuns(100);
        const found = runs.find((r) => r.id === TEST_RUN_ID);
        expect(found).toBeDefined();
      });

      test("returns runs with expected fields", async () => {
        const runs = await listRuns(100);
        const found = runs.find((r) => r.id === TEST_RUN_ID);
        expect(found?.benchmark).toBe("analyzer-unit-test");
        expect(found?.model).toBe("test-model");
        expect(found?.status).toBe("completed");
      });
    });

    describe("getRunMetadata", () => {
      test("returns undefined for non-existent run", async () => {
        const run = await getRunMetadata("non-existent-run-id-12345");
        expect(run).toBeUndefined();
      });

      test("returns run for existing run", async () => {
        const run = await getRunMetadata(TEST_RUN_ID);
        expect(run).toBeDefined();
        expect(run?.id).toBe(TEST_RUN_ID);
      });

      test("returns completed status", async () => {
        const run = await getRunMetadata(TEST_RUN_ID);
        expect(run?.status).toBe("completed");
      });

      test("returns final score", async () => {
        const run = await getRunMetadata(TEST_RUN_ID);
        expect(run?.final_score).toBe(100);
      });
    });
  });

  describe("analyzeQuickFromDb", () => {
    const RUN_ID = `analyzer-quick-${Date.now()}`;

    beforeAll(async () => {
      await initSchema();
      await insertRun({
        id: RUN_ID,
        benchmark: "quick-analysis-test",
        model: "gpt-4o-test",
      });
      await insertStep({
        runId: RUN_ID,
        stepNumber: 1,
        type: "start",
        data: { benchmark: "quick-analysis-test", model: "gpt-4o-test" },
      });
      await insertStep({
        runId: RUN_ID,
        stepNumber: 2,
        type: "thinking",
        data: { msg: "Analyzing situation" },
      });
      await insertStep({
        runId: RUN_ID,
        stepNumber: 3,
        type: "tool",
        data: { tool: "getScore", input: {}, output: { score: 500 } },
      });
      await insertStep({
        runId: RUN_ID,
        stepNumber: 4,
        type: "tool",
        data: { tool: "getScore", input: {}, output: { score: 490 } },
      });
      await insertStep({
        runId: RUN_ID,
        stepNumber: 5,
        type: "tool",
        data: {
          tool: "adjustScore",
          input: { delta: 10 },
          output: { newScore: 500 },
        },
      });
      await insertStep({
        runId: RUN_ID,
        stepNumber: 6,
        type: "transition",
        data: { from: "analyzing", to: "executing" },
      });
      await insertStep({
        runId: RUN_ID,
        stepNumber: 7,
        type: "end",
        data: { finalScore: 500 },
      });
      await completeRun(RUN_ID, 500);
    });

    test("returns benchmark name", async () => {
      const result = await analyzeQuickFromDb(RUN_ID);
      expect(result.benchmark).toBe("quick-analysis-test");
    });

    test("returns model name", async () => {
      const result = await analyzeQuickFromDb(RUN_ID);
      expect(result.model).toBe("gpt-4o-test");
    });

    test("calculates duration", async () => {
      const result = await analyzeQuickFromDb(RUN_ID);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test("counts total steps", async () => {
      const result = await analyzeQuickFromDb(RUN_ID);
      expect(result.totalSteps).toBe(7);
    });

    test("counts tool usage", async () => {
      const result = await analyzeQuickFromDb(RUN_ID);
      expect(result.toolUsage.length).toBe(2);
    });

    test("sorts tool usage by count", async () => {
      const result = await analyzeQuickFromDb(RUN_ID);
      expect(result.toolUsage[0]?.tool).toBe("getScore");
      expect(result.toolUsage[0]?.count).toBe(2);
      expect(result.toolUsage[1]?.tool).toBe("adjustScore");
      expect(result.toolUsage[1]?.count).toBe(1);
    });

    test("handles non-existent run", async () => {
      const result = await analyzeQuickFromDb("non-existent-run-12345");
      expect(result.benchmark).toBe("unknown");
      expect(result.model).toBe("unknown");
      expect(result.totalSteps).toBe(0);
    });

    test("handles run without tool calls", async () => {
      const noToolsRunId = `${RUN_ID}-no-tools`;
      await insertRun({
        id: noToolsRunId,
        benchmark: "no-tools",
        model: "test",
      });
      await insertStep({
        runId: noToolsRunId,
        stepNumber: 1,
        type: "start",
        data: { benchmark: "no-tools", model: "test" },
      });
      await insertStep({
        runId: noToolsRunId,
        stepNumber: 2,
        type: "end",
        data: {},
      });

      const result = await analyzeQuickFromDb(noToolsRunId);
      expect(result.toolUsage).toEqual([]);
    });

    test("handles incomplete run (no end)", async () => {
      const incompleteRunId = `${RUN_ID}-incomplete`;
      await insertRun({
        id: incompleteRunId,
        benchmark: "incomplete",
        model: "test",
      });
      await insertStep({
        runId: incompleteRunId,
        stepNumber: 1,
        type: "start",
        data: { benchmark: "incomplete", model: "test" },
      });
      await insertStep({
        runId: incompleteRunId,
        stepNumber: 2,
        type: "thinking",
        data: { msg: "Thinking..." },
      });

      const result = await analyzeQuickFromDb(incompleteRunId);
      expect(result.duration).toBe(0);
      expect(result.benchmark).toBe("incomplete");
    });
  });

  describe("tools", () => {
    const createContext = (analyzerState: AnalyzerState) => ({
      experimental_context: analyzerState,
    });

    const executeTool = <T>(
      tool: {
        execute: (
          input: T,
          context: { experimental_context: unknown }
        ) => unknown;
      },
      input: T,
      analyzerState: AnalyzerState
    ) => tool.execute(input, createContext(analyzerState));

    let state: AnalyzerState;
    let logs: BenchmarkLogEntry[];

    beforeEach(() => {
      logs = [
        {
          level: 30,
          time: "2024-01-01T10:00:00.000Z",
          benchmark: "test-bench",
          model: "test-model",
          msg: "Starting benchmark",
          type: "start",
        },
        {
          level: 30,
          time: "2024-01-01T10:00:01.000Z",
          benchmark: "test-bench",
          msg: "Analyzing the current situation",
          type: "thinking",
        },
        {
          level: 30,
          time: "2024-01-01T10:00:02.000Z",
          benchmark: "test-bench",
          msg: "Called getScore",
          type: "tool",
          tool: "getScore",
          input: {},
          output: { score: 500 },
        },
        {
          level: 30,
          time: "2024-01-01T10:00:03.000Z",
          benchmark: "test-bench",
          msg: "Deciding next action",
          type: "thinking",
        },
        {
          level: 30,
          time: "2024-01-01T10:00:04.000Z",
          benchmark: "test-bench",
          msg: "Called adjustScore",
          type: "tool",
          tool: "adjustScore",
          input: { delta: 10 },
          output: { newScore: 510 },
        },
        {
          level: 30,
          time: "2024-01-01T10:00:05.000Z",
          benchmark: "test-bench",
          msg: "Called getScore again",
          type: "tool",
          tool: "getScore",
          input: {},
          output: { score: 510 },
        },
        {
          level: 30,
          time: "2024-01-01T10:00:06.000Z",
          benchmark: "test-bench",
          msg: "State transition",
          type: "transition",
          from: "analyzing",
          to: "executing",
        },
        {
          level: 30,
          time: "2024-01-01T10:00:10.000Z",
          benchmark: "test-bench",
          msg: "Benchmark complete",
          type: "end",
          finalScore: 510,
        },
      ] as BenchmarkLogEntry[];

      state = {
        logs,
        filePath: "/test/logs/run-123.ndjson",
        findings: [],
      };
    });

    describe("getToolUsageTool", () => {
      test("counts tool invocations correctly", () => {
        const result = executeTool(getToolUsageTool, {}, state) as {
          total: number;
          tools: { tool: string; count: number; percentage: number }[];
        };
        expect(result.total).toBe(3);
        expect(result.tools.length).toBe(2);
      });

      test("calculates percentages correctly", () => {
        const result = executeTool(getToolUsageTool, {}, state) as {
          total: number;
          tools: { tool: string; count: number; percentage: number }[];
        };
        const getScoreUsage = result.tools.find((t) => t.tool === "getScore");
        expect(getScoreUsage?.count).toBe(2);
        expect(getScoreUsage?.percentage).toBeCloseTo(66.67, 1);
      });

      test("sorts by count descending", () => {
        const result = executeTool(getToolUsageTool, {}, state) as {
          total: number;
          tools: { tool: string; count: number }[];
        };
        expect(result.tools[0]?.tool).toBe("getScore");
        expect(result.tools[1]?.tool).toBe("adjustScore");
      });

      test("handles empty logs", () => {
        state.logs = [];
        const result = executeTool(getToolUsageTool, {}, state) as {
          total: number;
          tools: { tool: string; count: number; percentage: number }[];
        };
        expect(result.total).toBe(0);
        expect(result.tools).toEqual([]);
      });
    });

    describe("getDurationTool", () => {
      test("calculates duration from start/end", () => {
        const result = executeTool(getDurationTool, {}, state) as {
          duration: number;
          startTime: string;
          endTime: string;
        };
        expect(result.duration).toBe(10);
        expect(result.startTime).toBe("2024-01-01T10:00:00.000Z");
        expect(result.endTime).toBe("2024-01-01T10:00:10.000Z");
      });

      test("returns zero for missing start marker", () => {
        state.logs = logs.filter((l) => l.type !== "start");
        const result = executeTool(getDurationTool, {}, state) as {
          duration: number;
          error?: string;
        };
        expect(result.duration).toBe(0);
        expect(result.error).toBe("Missing start or end markers");
      });

      test("returns zero for missing end marker", () => {
        state.logs = logs.filter((l) => l.type !== "end");
        const result = executeTool(getDurationTool, {}, state) as {
          duration: number;
          error?: string;
        };
        expect(result.duration).toBe(0);
        expect(result.error).toBe("Missing start or end markers");
      });
    });

    describe("getThinkingTool", () => {
      test("extracts thinking blocks", () => {
        const result = executeTool(getThinkingTool, {}, state) as {
          count: number;
          samples: string[];
        };
        expect(result.count).toBe(2);
        expect(result.samples).toContain("Analyzing the current situation");
        expect(result.samples).toContain("Deciding next action");
      });

      test("respects limit parameter", () => {
        const result = executeTool(getThinkingTool, { limit: 1 }, state) as {
          count: number;
          samples: string[];
        };
        expect(result.count).toBe(1);
        expect(result.samples.length).toBe(1);
      });
    });

    describe("getTimelineTool", () => {
      test("returns chronological events", () => {
        const result = executeTool(getTimelineTool, {}, state) as {
          time: string;
          type: string;
          message: string;
        }[];
        expect(result.length).toBe(8);
        expect(result[0]?.type).toBe("start");
        expect(result.at(-1)?.type).toBe("end");
      });

      test("filters by type", () => {
        const result = executeTool(
          getTimelineTool,
          { types: ["tool"] },
          state
        ) as { time: string; type: string; message: string }[];
        expect(result.length).toBe(3);
        for (const event of result) {
          expect(event.type).toBe("tool");
        }
      });

      test("respects limit parameter", () => {
        const result = executeTool(getTimelineTool, { limit: 3 }, state) as {
          time: string;
          type: string;
          message: string;
        }[];
        expect(result.length).toBe(3);
      });
    });

    describe("getSummaryTool", () => {
      test("aggregates benchmark metadata", () => {
        const result = executeTool(getSummaryTool, {}, state) as {
          filePath: string;
          benchmark: string;
          model: string;
          duration: number;
          totalEntries: number;
        };
        expect(result.filePath).toBe("/test/logs/run-123.ndjson");
        expect(result.benchmark).toBe("test-bench");
        expect(result.model).toBe("test-model");
      });

      test("counts entries correctly", () => {
        const result = executeTool(getSummaryTool, {}, state) as {
          totalEntries: number;
          thinkingCount: number;
          toolCallCount: number;
          transitionCount: number;
        };
        expect(result.totalEntries).toBe(8);
        expect(result.thinkingCount).toBe(2);
        expect(result.toolCallCount).toBe(3);
        expect(result.transitionCount).toBe(1);
      });
    });

    describe("searchLogsTool", () => {
      test("finds matching patterns", () => {
        const result = executeTool(
          searchLogsTool,
          { pattern: "score" },
          state
        ) as {
          pattern: string;
          matchCount: number;
          matches: { time: string; type: string; message: string }[];
        };
        expect(result.matchCount).toBe(3);
      });

      test("case insensitive search", () => {
        const result = executeTool(
          searchLogsTool,
          { pattern: "SCORE" },
          state
        ) as { matchCount: number };
        expect(result.matchCount).toBe(3);
      });

      test("returns empty for no matches", () => {
        const result = executeTool(
          searchLogsTool,
          { pattern: "nonexistent" },
          state
        ) as { matchCount: number; matches: unknown[] };
        expect(result.matchCount).toBe(0);
        expect(result.matches).toEqual([]);
      });
    });

    describe("recordFindingTool", () => {
      test("appends to findings array", () => {
        expect(state.findings.length).toBe(0);
        executeTool(
          recordFindingTool,
          {
            type: "violation",
            severity: "warning",
            category: "safety",
            description: "Test finding",
          },
          state
        );
        expect(state.findings.length).toBe(1);
      });

      test("includes severity and category", () => {
        executeTool(
          recordFindingTool,
          {
            type: "violation",
            severity: "critical",
            category: "efficiency",
            description: "Critical issue found",
          },
          state
        );
        const finding = state.findings[0];
        expect(finding?.severity).toBe("critical");
        expect(finding?.category).toBe("efficiency");
      });

      test("returns recorded status and count", () => {
        const result = executeTool(
          recordFindingTool,
          {
            type: "observation",
            category: "general",
            description: "Observation",
          },
          state
        ) as { recorded: boolean; totalFindings: number };
        expect(result.recorded).toBe(true);
        expect(result.totalFindings).toBe(1);
      });
    });
  });

  describe("file-based analysis", () => {
    const createTempLogFile = (logs: Record<string, unknown>[]) => {
      const tmpPath = `/tmp/test-logs-${Date.now()}.ndjson`;
      const content = logs.map((l) => JSON.stringify(l)).join("\n");
      const fs = require("node:fs");
      fs.writeFileSync(tmpPath, content);
      return tmpPath;
    };

    const removeTempFile = (path: string) => {
      try {
        const fs = require("node:fs");
        fs.unlinkSync(path);
      } catch {
        // Ignore cleanup errors
      }
    };

    describe("analyzeQuick", () => {
      test("extracts benchmark and model from start log", async () => {
        const { analyzeQuick } = await import("../src/analyzer/analyze");
        const logs = [
          {
            level: "30",
            time: "2024-01-01T10:00:00.000Z",
            type: "start",
            benchmark: "test-benchmark",
            model: "test-model",
            msg: "Starting",
          },
          {
            level: "30",
            time: "2024-01-01T10:00:05.000Z",
            type: "end",
            benchmark: true,
            msg: "Done",
          },
        ];
        const tmpPath = createTempLogFile(logs);

        try {
          const result = analyzeQuick(tmpPath);
          expect(result.benchmark).toBe("test-benchmark");
          expect(result.model).toBe("test-model");
          expect(result.duration).toBe(5);
          expect(result.totalSteps).toBe(2);
        } finally {
          removeTempFile(tmpPath);
        }
      });

      test("counts tool usage correctly", async () => {
        const { analyzeQuick } = await import("../src/analyzer/analyze");
        const logs = [
          {
            level: "30",
            time: "2024-01-01T10:00:00.000Z",
            type: "start",
            benchmark: "tool-test",
            model: "test",
            msg: "Starting",
          },
          {
            level: "30",
            time: "2024-01-01T10:00:01.000Z",
            type: "tool",
            tool: "getScore",
            benchmark: true,
            msg: "Called getScore",
          },
          {
            level: "30",
            time: "2024-01-01T10:00:02.000Z",
            type: "tool",
            tool: "getScore",
            benchmark: true,
            msg: "Called getScore again",
          },
          {
            level: "30",
            time: "2024-01-01T10:00:03.000Z",
            type: "tool",
            tool: "adjustScore",
            benchmark: true,
            msg: "Called adjustScore",
          },
          {
            level: "30",
            time: "2024-01-01T10:00:04.000Z",
            type: "end",
            benchmark: true,
            msg: "Done",
          },
        ];
        const tmpPath = createTempLogFile(logs);

        try {
          const result = analyzeQuick(tmpPath);
          expect(result.toolUsage.length).toBe(2);
          expect(result.toolUsage[0]?.tool).toBe("getScore");
          expect(result.toolUsage[0]?.count).toBe(2);
          expect(result.toolUsage[1]?.tool).toBe("adjustScore");
          expect(result.toolUsage[1]?.count).toBe(1);
        } finally {
          removeTempFile(tmpPath);
        }
      });

      test("handles logs without start/end (zero duration)", async () => {
        const { analyzeQuick } = await import("../src/analyzer/analyze");
        const logs = [
          {
            level: "30",
            time: "2024-01-01T10:00:00.000Z",
            type: "thinking",
            benchmark: true,
            msg: "Thinking...",
          },
        ];
        const tmpPath = createTempLogFile(logs);

        try {
          const result = analyzeQuick(tmpPath);
          expect(result.duration).toBe(0);
          expect(result.benchmark).toBe("unknown");
          expect(result.model).toBe("unknown");
        } finally {
          removeTempFile(tmpPath);
        }
      });

      test("handles empty tool usage", async () => {
        const { analyzeQuick } = await import("../src/analyzer/analyze");
        const logs = [
          {
            level: "30",
            time: "2024-01-01T10:00:00.000Z",
            type: "start",
            benchmark: "no-tools",
            model: "test",
            msg: "Starting",
          },
          {
            level: "30",
            time: "2024-01-01T10:00:01.000Z",
            type: "thinking",
            benchmark: true,
            msg: "Just thinking",
          },
          {
            level: "30",
            time: "2024-01-01T10:00:02.000Z",
            type: "end",
            benchmark: true,
            msg: "Done",
          },
        ];
        const tmpPath = createTempLogFile(logs);

        try {
          const result = analyzeQuick(tmpPath);
          expect(result.toolUsage).toEqual([]);
        } finally {
          removeTempFile(tmpPath);
        }
      });
    });

    describe("createAnalyzerAgentFromDb", () => {
      const DB_RUN_ID = `analyzer-agent-${Date.now()}`;

      beforeAll(async () => {
        await initSchema();
        await insertRun({
          id: DB_RUN_ID,
          benchmark: "agent-creation-test",
          model: "test-model",
        });
        await insertStep({
          runId: DB_RUN_ID,
          stepNumber: 1,
          type: "start",
          data: { benchmark: "agent-creation-test", model: "test-model" },
        });
        await insertStep({
          runId: DB_RUN_ID,
          stepNumber: 2,
          type: "end",
          data: {},
        });
        await completeRun(DB_RUN_ID, 500);
      });

      test("creates agent and state from DB run", async () => {
        const { createAnalyzerAgentFromDb } = await import(
          "../src/analyzer/analyze"
        );
        const { agent, state } = await createAnalyzerAgentFromDb(DB_RUN_ID);

        expect(agent).toBeDefined();
        expect(state).toBeDefined();
        expect(state.logs.length).toBe(2);
        expect(state.filePath).toBe(`db:${DB_RUN_ID}`);
        expect(state.findings).toEqual([]);
      });

      test("creates agent with custom model", async () => {
        const { createAnalyzerAgentFromDb } = await import(
          "../src/analyzer/analyze"
        );
        const { agent } = await createAnalyzerAgentFromDb(
          DB_RUN_ID,
          "anthropic/claude-3-haiku"
        );

        expect(agent).toBeDefined();
      });
    });
  });
});
