/**
 * DB Tests
 *
 * Tests for src/db/ (queries, schema, persistence)
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { listRuns, loadLogsFromDb } from "../src/analyzer/db-loader";
import {
  completeRun,
  failRun,
  getAllRuns,
  getReasoningParts,
  getRecentRuns,
  getRun,
  getRunModelOutputs,
  getRunRequests,
  getRunSteps,
  getRunToolCalls,
  getRunTotalUsage,
  getRunUsage,
  getStepsByFinishReason,
  insertModelOutput,
  insertModelRequest,
  insertReasoningPart,
  insertRun,
  insertStep,
  insertToolCall,
  insertUsage,
  searchReasoningParts,
} from "../src/db/queries";
import { initSchema } from "../src/db/schema";

describe("db", () => {
  const RUN_ID_PREFIX = `db-test-${Date.now()}`;

  beforeAll(async () => {
    await initSchema();
  });

  describe("queries", () => {
    describe("run lifecycle", () => {
      const runId = `${RUN_ID_PREFIX}-lifecycle`;

      test("insertRun creates a new run", async () => {
        await insertRun({
          id: runId,
          benchmark: "test-bench",
          model: "test-model",
        });

        const run = await getRun(runId);
        expect(run).toBeDefined();
        expect(run?.status).toBe("running");
      });

      test("completeRun updates status and score", async () => {
        await completeRun(runId, 750, {
          inputTokens: 100,
          outputTokens: 50,
          cost: 0.01,
        });

        const run = await getRun(runId);
        expect(run?.status).toBe("completed");
        expect(run?.final_score).toBe(750);
        expect(run?.total_input_tokens).toBe(100);
        expect(run?.total_output_tokens).toBe(50);
      });

      test("completeRun without usage sets zeros", async () => {
        const id = `${RUN_ID_PREFIX}-no-usage`;
        await insertRun({ id, benchmark: "test", model: "test" });
        await completeRun(id, 500);

        const run = await getRun(id);
        expect(run?.total_input_tokens).toBe(0);
        expect(run?.total_output_tokens).toBe(0);
      });
    });

    describe("failRun", () => {
      test("sets status to failed", async () => {
        const runId = `${RUN_ID_PREFIX}-fail`;
        await insertRun({ id: runId, benchmark: "test", model: "test" });
        await failRun(runId);

        const run = await getRun(runId);
        expect(run?.status).toBe("failed");
      });

      test("sets ended_at timestamp", async () => {
        const runId = `${RUN_ID_PREFIX}-fail-ts`;
        await insertRun({ id: runId, benchmark: "test", model: "test" });
        await failRun(runId);

        const run = await getRun(runId);
        expect(run?.ended_at).toBeDefined();
      });
    });

    describe("usage tracking", () => {
      const runId = `${RUN_ID_PREFIX}-usage`;

      beforeAll(async () => {
        await insertRun({ id: runId, benchmark: "usage-test", model: "test" });
      });

      test("insertUsage stores token counts", async () => {
        await insertUsage({
          runId,
          stepId: 1,
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 20,
          cacheWriteTokens: 10,
          reasoningTokens: 15,
        });

        const usage = await getRunUsage(runId);
        expect(usage.length).toBe(1);
      });

      test("insertUsage without optional fields", async () => {
        await insertUsage({
          runId,
          inputTokens: 200,
          outputTokens: 100,
        });

        const usage = await getRunUsage(runId);
        expect(usage.length).toBe(2);
      });

      test("getRunUsage returns all usage records", async () => {
        const usage = await getRunUsage(runId);
        expect(usage.length).toBeGreaterThanOrEqual(2);
      });

      test("getRunTotalUsage sums tokens", async () => {
        const totals = await getRunTotalUsage(runId);
        expect(totals).toBeDefined();
        expect(totals?.total_input).toBeGreaterThanOrEqual(300);
        expect(totals?.total_output).toBeGreaterThanOrEqual(150);
      });

      test("getRunTotalUsage for non-existent run", async () => {
        const totals = await getRunTotalUsage("non-existent");
        expect(totals?.total_input).toBe(null);
      });
    });

    describe("model requests", () => {
      const runId = `${RUN_ID_PREFIX}-requests`;

      beforeAll(async () => {
        await insertRun({
          id: runId,
          benchmark: "requests-test",
          model: "test",
        });
      });

      test("insertModelRequest stores prompt", async () => {
        const id = await insertModelRequest({
          runId,
          stepNumber: 1,
          prompt: "Test prompt",
          systemPrompt: "System prompt",
        });

        expect(id).toBeGreaterThan(0);
      });

      test("insertModelRequest without system prompt", async () => {
        const id = await insertModelRequest({
          runId,
          stepNumber: 2,
          prompt: "Another prompt",
        });

        expect(id).toBeGreaterThan(0);
      });

      test("getRunRequests returns all requests", async () => {
        const requests = await getRunRequests(runId);
        expect(requests.length).toBe(2);
        expect(requests[0]?.prompt).toBe("Test prompt");
      });

      test("getRunRequests ordered by id", async () => {
        const requests = await getRunRequests(runId);
        expect(requests[0]?.step_number).toBe(1);
        expect(requests[1]?.step_number).toBe(2);
      });
    });

    describe("model outputs", () => {
      const runId = `${RUN_ID_PREFIX}-outputs`;
      let outputId: number;

      beforeAll(async () => {
        await insertRun({
          id: runId,
          benchmark: "outputs-test",
          model: "test",
        });
        const stepId = await insertStep({
          runId,
          stepNumber: 1,
          type: "thinking",
        });
        outputId = await insertModelOutput({
          runId,
          stepId,
          stepType: "thinking",
          finishReason: "stop",
          text: "Model response",
          reasoningText: "Thinking text",
        });
      });

      test("insertModelOutput returns id", () => {
        expect(outputId).toBeGreaterThan(0);
      });

      test("getRunModelOutputs returns outputs", async () => {
        const outputs = await getRunModelOutputs(runId);
        expect(outputs.length).toBe(1);
        expect(outputs[0]?.text).toBe("Model response");
      });

      test("getStepsByFinishReason filters correctly", async () => {
        const stops = await getStepsByFinishReason(runId, "stop");
        expect(stops.length).toBe(1);

        const toolUse = await getStepsByFinishReason(runId, "tool_use");
        expect(toolUse.length).toBe(0);
      });

      test("insertModelOutput with minimal fields", async () => {
        const stepId = await insertStep({
          runId,
          stepNumber: 2,
          type: "tool",
        });
        const id = await insertModelOutput({
          runId,
          stepId,
        });
        expect(id).toBeGreaterThan(0);
      });
    });

    describe("reasoning parts", () => {
      const runId = `${RUN_ID_PREFIX}-reasoning`;
      let outputId: number;

      beforeAll(async () => {
        await insertRun({
          id: runId,
          benchmark: "reasoning-test",
          model: "test",
        });
        const stepId = await insertStep({
          runId,
          stepNumber: 1,
          type: "thinking",
        });
        outputId = await insertModelOutput({
          runId,
          stepId,
          finishReason: "stop",
        });

        await insertReasoningPart({
          runId,
          outputId,
          partIndex: 0,
          text: "First thinking block",
        });
        await insertReasoningPart({
          runId,
          outputId,
          partIndex: 1,
          text: "Second thinking block with keyword",
        });
      });

      test("getReasoningParts returns parts for output", async () => {
        const parts = await getReasoningParts(outputId);
        expect(parts.length).toBe(2);
      });

      test("getReasoningParts ordered by part_index", async () => {
        const parts = await getReasoningParts(outputId);
        expect(parts[0]?.part_index).toBe(0);
        expect(parts[1]?.part_index).toBe(1);
      });

      test("searchReasoningParts finds matching text", async () => {
        const results = await searchReasoningParts(runId, "keyword");
        expect(results.length).toBe(1);
        expect(results[0]?.text).toContain("keyword");
      });

      test("searchReasoningParts returns empty for no match", async () => {
        const results = await searchReasoningParts(runId, "nonexistent");
        expect(results.length).toBe(0);
      });

      test("searchReasoningParts case sensitive", async () => {
        const results = await searchReasoningParts(runId, "KEYWORD");
        expect(results.length).toBe(1);
      });
    });

    describe("getAllRuns", () => {
      test("returns all runs", async () => {
        const runs = await getAllRuns();
        expect(runs.length).toBeGreaterThan(0);
      });

      test("ordered by started_at descending", async () => {
        const runs = await getAllRuns();
        const [first, second] = runs;
        if (first && second) {
          const firstTime = new Date(first.started_at).getTime();
          const secondTime = new Date(second.started_at).getTime();
          expect(firstTime).toBeGreaterThanOrEqual(secondTime);
        }
      });
    });

    describe("getRecentRuns", () => {
      test("returns limited runs", async () => {
        const runs = await getRecentRuns(3);
        expect(runs.length).toBeLessThanOrEqual(3);
      });

      test("default limit is 10", async () => {
        const runs = await getRecentRuns();
        expect(runs.length).toBeLessThanOrEqual(10);
      });

      test("ordered by started_at descending", async () => {
        const runs = await getRecentRuns(5);
        const [first, second] = runs;
        if (first && second) {
          const firstTime = new Date(first.started_at).getTime();
          const secondTime = new Date(second.started_at).getTime();
          expect(firstTime).toBeGreaterThanOrEqual(secondTime);
        }
      });
    });

    describe("steps and tool calls", () => {
      const runId = `${RUN_ID_PREFIX}-steps`;

      beforeAll(async () => {
        await insertRun({ id: runId, benchmark: "steps-test", model: "test" });
      });

      test("insertStep returns step id", async () => {
        const stepId = await insertStep({
          runId,
          stepNumber: 1,
          type: "start",
          data: { benchmark: "test" },
        });
        expect(stepId).toBeGreaterThan(0);
      });

      test("insertStep without data", async () => {
        const stepId = await insertStep({
          runId,
          stepNumber: 2,
          type: "thinking",
        });
        expect(stepId).toBeGreaterThan(0);
      });

      test("getRunSteps ordered by step_number", async () => {
        await insertStep({ runId, stepNumber: 3, type: "end" });
        const steps = await getRunSteps(runId);
        expect(steps[0]?.step_number).toBe(1);
        expect(steps[1]?.step_number).toBe(2);
        expect(steps[2]?.step_number).toBe(3);
      });

      test("insertToolCall stores tool data", async () => {
        await insertToolCall({
          runId,
          stepId: 1,
          toolName: "getScore",
          input: { limit: 10 },
          output: { score: 500 },
          durationMs: 50,
        });

        const calls = await getRunToolCalls(runId);
        expect(calls.length).toBe(1);
        expect(calls[0]?.tool_name).toBe("getScore");
      });

      test("insertToolCall without optional fields", async () => {
        await insertToolCall({
          runId,
          toolName: "waitForNextStep",
        });

        const calls = await getRunToolCalls(runId);
        expect(calls.length).toBe(2);
      });

      test("getRunToolCalls ordered by id", async () => {
        const calls = await getRunToolCalls(runId);
        expect(calls[0]?.tool_name).toBe("getScore");
        expect(calls[1]?.tool_name).toBe("waitForNextStep");
      });
    });

    describe("getRun", () => {
      test("returns undefined for non-existent run", async () => {
        const run = await getRun("definitely-does-not-exist-12345");
        expect(run).toBeUndefined();
      });

      test("returns run with all fields", async () => {
        const runId = `${RUN_ID_PREFIX}-getrun`;
        await insertRun({
          id: runId,
          benchmark: "getrun-test",
          model: "gpt-4",
        });

        const run = await getRun(runId);
        expect(run?.id).toBe(runId);
        expect(run?.benchmark).toBe("getrun-test");
        expect(run?.model).toBe("gpt-4");
        expect(run?.started_at).toBeDefined();
      });
    });
  });

  describe("integration: DB -> Analyzer", () => {
    const TEST_RUN_ID = `integration-${RUN_ID_PREFIX}`;
    const TEST_BENCHMARK = "integration-test";
    const TEST_MODEL = "test-model";
    let step3Id: number;

    beforeAll(async () => {
      await insertRun({
        id: TEST_RUN_ID,
        benchmark: TEST_BENCHMARK,
        model: TEST_MODEL,
      });

      await insertStep({
        runId: TEST_RUN_ID,
        stepNumber: 1,
        type: "start",
        data: { benchmark: TEST_BENCHMARK, model: TEST_MODEL },
      });

      await insertStep({
        runId: TEST_RUN_ID,
        stepNumber: 2,
        type: "thinking",
        data: { msg: "Analyzing the situation..." },
      });

      step3Id = await insertStep({
        runId: TEST_RUN_ID,
        stepNumber: 3,
        type: "tool",
        data: {
          tool: "getScore",
          input: { query: "current" },
          output: { score: 100 },
        },
      });

      await insertToolCall({
        runId: TEST_RUN_ID,
        stepId: step3Id,
        toolName: "getScore",
        input: { query: "current" },
        output: { score: 100 },
      });

      await insertStep({
        runId: TEST_RUN_ID,
        stepNumber: 4,
        type: "end",
        data: { finalScore: 100 },
      });

      await completeRun(TEST_RUN_ID, 100);
    });

    describe("database operations", () => {
      test("run is created and found", async () => {
        const run = await getRun(TEST_RUN_ID);
        expect(run).toBeDefined();
        expect(run?.id).toBe(TEST_RUN_ID);
      });

      test("run has correct benchmark and model", async () => {
        const run = await getRun(TEST_RUN_ID);
        expect(run?.benchmark).toBe(TEST_BENCHMARK);
        expect(run?.model).toBe(TEST_MODEL);
      });

      test("run status is completed", async () => {
        const run = await getRun(TEST_RUN_ID);
        expect(run?.status).toBe("completed");
      });

      test("run has final score", async () => {
        const run = await getRun(TEST_RUN_ID);
        expect(run?.final_score).toBe(100);
      });

      test("all steps are saved", async () => {
        const steps = await getRunSteps(TEST_RUN_ID);
        expect(steps.length).toBe(4);
      });

      test("steps have correct types in order", async () => {
        const steps = await getRunSteps(TEST_RUN_ID);
        expect(steps[0]?.type).toBe("start");
        expect(steps[1]?.type).toBe("thinking");
        expect(steps[2]?.type).toBe("tool");
        expect(steps[3]?.type).toBe("end");
      });

      test("tool call is saved", async () => {
        const toolCalls = await getRunToolCalls(TEST_RUN_ID);
        expect(toolCalls.length).toBe(1);
      });

      test("tool call has correct data", async () => {
        const toolCalls = await getRunToolCalls(TEST_RUN_ID);
        expect(toolCalls[0]?.tool_name).toBe("getScore");
      });
    });

    describe("analyzer db loader", () => {
      test("loads logs from database", async () => {
        const logs = await loadLogsFromDb(TEST_RUN_ID);
        expect(logs.length).toBe(4);
      });

      test("first log is start type", async () => {
        const logs = await loadLogsFromDb(TEST_RUN_ID);
        expect(logs[0]?.type).toBe("start");
      });

      test("last log is end type", async () => {
        const logs = await loadLogsFromDb(TEST_RUN_ID);
        expect(logs.at(-1)?.type).toBe("end");
      });

      test("logs contain data fields", async () => {
        const logs = await loadLogsFromDb(TEST_RUN_ID);
        const startLog = logs.find((l) => l.type === "start");
        expect(startLog?.benchmark).toBe(TEST_BENCHMARK);
      });

      test("lists recent runs including test run", async () => {
        const runs = await listRuns(100);
        const found = runs.find((r) => r.id === TEST_RUN_ID);
        expect(found).toBeDefined();
        expect(found?.benchmark).toBe(TEST_BENCHMARK);
      });
    });
  });
});
