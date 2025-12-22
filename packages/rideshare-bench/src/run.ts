#!/usr/bin/env node
/**
 * Rideshare Benchmark CLI
 *
 * Usage:
 *   bun run start [model]
 *
 * Examples:
 *   bun run start
 *   bun run start openai/gpt-4o
 *   bun run start anthropic/claude-3-5-sonnet-20241022
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type BenchmarkResult, runBenchmark } from "./benchmark.js";

const RESULTS_DIR = join(import.meta.dirname, "results");
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

type SavedResult = BenchmarkResult & {
  model: string;
  startedAt: string;
  endedAt: string;
  elapsedSeconds: number;
  interrupted: boolean;
};

const createTimestamp = (): string =>
  new Date().toISOString().replace(/[:.]/g, "-");

const createModelSlug = (model: string): string => model.replace(/\//g, "_");

const saveJsonResult = (result: SavedResult, timestamp: string): string => {
  const slug = createModelSlug(result.model);
  const filepath = join(RESULTS_DIR, `${timestamp}_${slug}.json`);
  writeFileSync(filepath, JSON.stringify(result, null, 2));
  return filepath;
};

const saveTranscript = (result: SavedResult, timestamp: string): string => {
  const slug = createModelSlug(result.model);
  const filepath = join(RESULTS_DIR, `${timestamp}_${slug}_transcript.txt`);
  writeFileSync(filepath, result.transcript.join("\n"));
  return filepath;
};

const main = async (): Promise<void> => {
  const model = process.argv[2] ?? DEFAULT_MODEL;
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  mkdirSync(RESULTS_DIR, { recursive: true });

  const transcript: string[] = [];
  let result: BenchmarkResult | null = null;

  process.on("SIGINT", () => {
    const elapsed = (Date.now() - startTime) / 1000;
    const timestamp = createTimestamp();

    const partialResult: SavedResult = {
      success: false,
      finalScore: result?.finalScore ?? 0,
      hoursCompleted: result?.hoursCompleted ?? 0,
      totalRides: result?.totalRides ?? 0,
      finalBalance: result?.finalBalance ?? 0,
      finalRating: result?.finalRating ?? 0,
      terminationReason: "error",
      hourlyLog: result?.hourlyLog ?? [],
      transcript,
      model,
      startedAt,
      endedAt: new Date().toISOString(),
      elapsedSeconds: elapsed,
      interrupted: true,
    };

    const jsonPath = saveJsonResult(partialResult, timestamp);
    const txtPath = saveTranscript(partialResult, timestamp);

    console.log("\nInterrupted. Results saved:");
    console.log(`  ${jsonPath}`);
    console.log(`  ${txtPath}`);

    process.exit(0);
  });

  console.log("============================================================");
  console.log("Rideshare-Bench");
  console.log("============================================================");
  console.log(`Model: ${model}`);
  console.log("Starting simulation...\n");

  result = await runBenchmark(model, undefined, true, transcript);

  const elapsed = (Date.now() - startTime) / 1000;
  const timestamp = createTimestamp();

  const savedResult: SavedResult = {
    ...result,
    model,
    startedAt,
    endedAt: new Date().toISOString(),
    elapsedSeconds: elapsed,
    interrupted: false,
  };

  const jsonPath = saveJsonResult(savedResult, timestamp);
  const txtPath = saveTranscript(savedResult, timestamp);

  console.log("\nResults saved:");
  console.log(`  ${jsonPath}`);
  console.log(`  ${txtPath}`);

  process.exit(result.success ? 0 : 1);
};

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
