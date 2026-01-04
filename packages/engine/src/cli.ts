#!/usr/bin/env bun
import { runBenchmark } from "./run.js";

const prompt = process.argv[2];
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

if (!prompt) {
  console.error("Usage: bun run start <prompt>");
  console.error(
    'Example: bun run start "Create a benchmark for testing API rate limiting"'
  );
  process.exit(1);
}

if (!anthropicApiKey) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is required");
  console.error("Set it with: export ANTHROPIC_API_KEY=your-key");
  process.exit(1);
}

console.log("Starting benchmark run...\n");
console.log(`Prompt: ${prompt}\n`);

const result = await runBenchmark({
  prompt,
  anthropicApiKey,
  onProgress: (phase, message) => {
    console.log(`[${phase}] ${message}`);
  },
});

console.log("\n=== Results ===\n");
console.log(`Run ID: ${result.runId}`);
console.log(`Score: ${result.results.score}`);
console.log("\nMetrics:");
console.log(`  Agent duration: ${result.metrics.agentDuration}ms`);
console.log(`  Benchmark duration: ${result.metrics.benchmarkDuration}ms`);
console.log(`  Total duration: ${result.metrics.totalDuration}ms`);
console.log(`\nSpec: ${result.spec.name}`);
console.log(`  ${result.spec.description}`);
console.log("\nTask Results:");
for (const task of result.results.taskResults) {
  console.log(`  - ${task.taskId}: ${task.passed ? "PASSED" : "FAILED"}`);
}
