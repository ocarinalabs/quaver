/**
 * Rideshare Benchmark
 *
 * A 7-day rideshare driver simulation benchmark.
 */

// biome-ignore lint/performance/noBarrelFile: Intentional entry point
export { createRideshareAgent, tools } from "./agent/index.js";
export type { BenchmarkResult, HourLog } from "./benchmark.js";
export { runBenchmark } from "./benchmark.js";
export type { RideshareState } from "./config/types.js";
