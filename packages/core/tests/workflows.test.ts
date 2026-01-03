/**
 * Workflows Tests
 *
 * Tests for src/workflows/ (runBenchmark, evaluator, loop, etc.)
 */

import { beforeAll, describe, expect, test } from "bun:test";
import "dotenv/config";
import { getRun, getRunSteps, getRunToolCalls } from "../src/db/queries";
import type { BenchmarkResult } from "../src/workflows/loop";
import { runBenchmark } from "../src/workflows/loop";

// E2E tests require API key
const hasApiKey = !!process.env.AI_GATEWAY_API_KEY;

describe("workflows", () => {
  describe("runBenchmark (e2e)", () => {
    let result: BenchmarkResult;

    beforeAll(async () => {
      if (!hasApiKey) {
        return;
      }
      // Run the benchmark once, reuse for all assertions
      result = await runBenchmark("google/gemini-3-flash", {
        persist: true,
        logLevel: "normal",
        benchmark: "e2e-test",
        providerOptions: {
          gateway: {
            zeroDataRetention: false, // Gemini 3 Flash has no ZDR providers
          },
          google: {
            thinkingConfig: {
              thinkingLevel: "high",
              includeThoughts: true,
            },
          },
        },
      });

      // Wait for async stream to flush
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }, 120_000); // 2 minute timeout for LLM call

    describe("benchmark result", () => {
      test.skipIf(!hasApiKey)("returns defined result", () => {
        expect(result).toBeDefined();
      });

      test.skipIf(!hasApiKey)("has runId", () => {
        expect(result.runId).toBeDefined();
        expect(typeof result.runId).toBe("string");
      });

      test.skipIf(!hasApiKey)("has numeric score", () => {
        expect(typeof result.score).toBe("number");
      });

      test.skipIf(!hasApiKey)("has numeric finalStep", () => {
        expect(typeof result.finalStep).toBe("number");
        expect(result.finalStep).toBeGreaterThan(0);
      });

      test.skipIf(!hasApiKey)("has elapsed time", () => {
        expect(typeof result.elapsedSeconds).toBe("number");
        expect(result.elapsedSeconds).toBeGreaterThan(0);
      });

      test.skipIf(!hasApiKey)("has timestamps", () => {
        expect(result.startedAt).toBeDefined();
        expect(result.endedAt).toBeDefined();
      });

      test.skipIf(!hasApiKey)("has model identifier", () => {
        expect(result.model).toBe("google/gemini-3-flash");
      });

      test.skipIf(!hasApiKey)("has step log", () => {
        expect(Array.isArray(result.stepLog)).toBe(true);
      });
    });

    describe("database persistence", () => {
      test.skipIf(!hasApiKey)("run is persisted to database", async () => {
        const run = await getRun(result.runId);
        expect(run).toBeDefined();
        expect(run?.id).toBe(result.runId);
      });

      test.skipIf(!hasApiKey)("run status is completed", async () => {
        const run = await getRun(result.runId);
        expect(run?.status).toBe("completed");
      });

      test.skipIf(!hasApiKey)("final score matches result", async () => {
        const run = await getRun(result.runId);
        expect(run?.final_score).toBe(result.score);
      });

      test.skipIf(!hasApiKey)("benchmark name is recorded", async () => {
        const run = await getRun(result.runId);
        expect(run?.benchmark).toBe("e2e-test");
      });

      test.skipIf(!hasApiKey)("model is recorded", async () => {
        const run = await getRun(result.runId);
        expect(run?.model).toBe("google/gemini-3-flash");
      });
    });

    describe("steps and tool calls", () => {
      test.skipIf(!hasApiKey)("steps are recorded", async () => {
        const steps = await getRunSteps(result.runId);
        expect(steps.length).toBeGreaterThan(0);
      });

      test.skipIf(!hasApiKey)("tool calls are recorded", async () => {
        const toolCalls = await getRunToolCalls(result.runId);
        // At minimum, waitForNextStep should be called
        expect(toolCalls.length).toBeGreaterThan(0);
      });
    });

    describe("token tracking", () => {
      test.skipIf(!hasApiKey)("tracks input tokens", async () => {
        const run = await getRun(result.runId);
        expect(run?.total_input_tokens).toBeGreaterThan(0);
      });

      test.skipIf(!hasApiKey)("tracks output tokens", async () => {
        const run = await getRun(result.runId);
        expect(run?.total_output_tokens).toBeGreaterThan(0);
      });
    });
  });
});
