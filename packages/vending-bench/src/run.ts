/**
 * Vending-Bench CLI Runner
 *
 * Usage:
 *   bun --env-file=.env.local run src/run.ts [model]
 *
 * Or from monorepo root:
 *   bun --env-file=packages/vending-bench/.env.local run packages/vending-bench/src/run.ts [model]
 *
 * Examples:
 *   bun run start
 *   bun --env-file=.env.local run src/run.ts anthropic/claude-sonnet-4.5
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BenchmarkResult } from "./benchmark.js";
import { runBenchmark } from "./benchmark.js";

// Initialize gateway (sets default provider)
import "./config/gateway.js";

// --- Results Directory ---

const RESULTS_DIR = join(import.meta.dirname, "results");

// Ensure results directory exists
try {
  mkdirSync(RESULTS_DIR, { recursive: true });
} catch {
  // Directory already exists
}

// --- Result Saving ---

type SavedResult = BenchmarkResult & {
  model: string;
  startedAt: string;
  endedAt: string;
  elapsedSeconds: number;
  interrupted: boolean;
};

const saveResult = (result: SavedResult): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const modelSlug = result.model.replace(/\//g, "_");
  const filename = `${timestamp}_${modelSlug}.json`;
  const filepath = join(RESULTS_DIR, filename);

  writeFileSync(filepath, JSON.stringify(result, null, 2));
  return filepath;
};

// --- Progress Tracking ---

let currentDay = 1;
let currentNetWorth = 500;
let startTime = Date.now();
let currentModel = "anthropic/claude-sonnet-4.5";
const startedAt = new Date().toISOString();

// Handle Ctrl+C - save partial results
process.on("SIGINT", () => {
  console.log("\n\n⚠️  Benchmark interrupted by user (Ctrl+C)");

  const elapsed = (Date.now() - startTime) / 1000;
  const partialResult: SavedResult = {
    finalDay: currentDay,
    netWorth: currentNetWorth,
    bankrupt: false,
    totalUnitsSold: 0, // Unknown at interrupt
    totalRevenue: 0, // Unknown at interrupt
    dailyLog: [], // Not tracked during interrupt
    model: currentModel,
    startedAt,
    endedAt: new Date().toISOString(),
    elapsedSeconds: elapsed,
    interrupted: true,
  };

  const filepath = saveResult(partialResult);
  console.log(`\n💾 Partial results saved to: ${filepath}`);
  process.exit(0);
});

// --- Main ---

const main = async (): Promise<void> => {
  currentModel = process.argv[2] ?? "anthropic/claude-sonnet-4.5";

  console.log("=".repeat(60));
  console.log("Vending-Bench 2");
  console.log("=".repeat(60));
  console.log(`Model: ${currentModel}`);
  console.log(`Results will be saved to: ${RESULTS_DIR}`);
  console.log("Starting simulation...");
  console.log("");

  startTime = Date.now();

  // Run benchmark with progress callback
  const result = await runBenchmark(currentModel, (day, netWorth) => {
    currentDay = day;
    currentNetWorth = netWorth;
    console.log(`Day ${day}: Net worth $${netWorth.toFixed(2)}`);
  });

  const elapsed = (Date.now() - startTime) / 1000;

  // Print results
  console.log("");
  console.log("=".repeat(60));
  console.log("BENCHMARK COMPLETE");
  console.log("=".repeat(60));
  console.log(`Final Day:        ${result.finalDay}`);
  console.log(`Net Worth:        $${result.netWorth.toFixed(2)}`);
  console.log(`Bankrupt:         ${result.bankrupt ? "YES" : "NO"}`);
  console.log(`Total Units Sold: ${result.totalUnitsSold}`);
  console.log(`Total Revenue:    $${result.totalRevenue.toFixed(2)}`);
  console.log(`Elapsed Time:     ${elapsed.toFixed(1)}s`);
  console.log("=".repeat(60));

  // Save results to file
  const savedResult: SavedResult = {
    ...result,
    model: currentModel,
    startedAt,
    endedAt: new Date().toISOString(),
    elapsedSeconds: elapsed,
    interrupted: false,
  };

  const filepath = saveResult(savedResult);
  console.log(`\n💾 Results saved to: ${filepath}`);
};

main().catch((error: unknown) => {
  console.error("Benchmark failed:", error);
  process.exit(1);
});
