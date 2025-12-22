/**
 * Integration Test: Logger -> DB -> Analyzer
 *
 * Verifies the full flow:
 * 1. Direct DB writes work
 * 2. DB stores steps and tool calls
 * 3. Analyzer can load from DB
 *
 * Note: Uses direct DB writes for testing since pino.transport
 * requires compiled .js files (worker thread limitation).
 *
 * Run: bun packages/core/src/test-integration.ts
 */

import { listRuns, loadLogsFromDb } from "./analyzer/db-loader.js";
import {
  completeRun,
  getRun,
  getRunSteps,
  getRunToolCalls,
  insertRun,
  insertStep,
  insertToolCall,
} from "./db/queries.js";
import { initSchema } from "./db/schema.js";

const TEST_RUN_ID = `test-${Date.now()}`;
const TEST_BENCHMARK = "integration-test";
const TEST_MODEL = "test-model";

const main = async () => {
  console.log("=== Integration Test: DB -> Analyzer ===\n");

  // 1. Initialize schema
  console.log("1. Initializing database schema...");
  await initSchema();
  console.log("   ✓ Schema initialized\n");

  // 2. Insert run directly
  console.log("2. Inserting run...");
  await insertRun({
    id: TEST_RUN_ID,
    benchmark: TEST_BENCHMARK,
    model: TEST_MODEL,
  });
  console.log(`   ✓ Run created (runId: ${TEST_RUN_ID})\n`);

  // 3. Insert steps and tool calls
  console.log("3. Inserting steps and tool calls...");

  const step1Id = await insertStep({
    runId: TEST_RUN_ID,
    stepNumber: 1,
    type: "start",
    data: { benchmark: TEST_BENCHMARK, model: TEST_MODEL },
  });
  console.log(`   ✓ Step 1 inserted (id: ${step1Id})`);

  const step2Id = await insertStep({
    runId: TEST_RUN_ID,
    stepNumber: 2,
    type: "thinking",
    data: { msg: "Analyzing the situation..." },
  });
  console.log(`   ✓ Step 2 inserted (id: ${step2Id})`);

  const step3Id = await insertStep({
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
  console.log(`   ✓ Step 3 + tool call inserted (id: ${step3Id})`);

  const step4Id = await insertStep({
    runId: TEST_RUN_ID,
    stepNumber: 4,
    type: "end",
    data: { finalScore: 100 },
  });
  await completeRun(TEST_RUN_ID, 100);
  console.log(`   ✓ Step 4 (end) inserted (id: ${step4Id})\n`);

  // 4. Query DB directly
  console.log("4. Querying database...");
  const run = await getRun(TEST_RUN_ID);
  const steps = await getRunSteps(TEST_RUN_ID);
  const toolCalls = await getRunToolCalls(TEST_RUN_ID);

  console.log(`   Run: ${run ? `found (status: ${run.status})` : "NOT FOUND"}`);
  console.log(`   Steps: ${steps.length}`);
  console.log(`   Tool calls: ${toolCalls.length}\n`);

  // 5. Test analyzer DB loader
  console.log("5. Testing analyzer DB loader...");
  const logs = await loadLogsFromDb(TEST_RUN_ID);
  console.log(`   Logs loaded: ${logs.length}`);
  if (logs.length > 0) {
    console.log(`   First log type: ${logs[0].type}`);
    console.log(`   Last log type: ${logs.at(-1)?.type}`);
  }
  console.log();

  // 6. List recent runs
  console.log("6. Listing recent runs...");
  const recentRuns = await listRuns(5);
  console.log(`   Recent runs: ${recentRuns.length}`);
  for (const r of recentRuns.slice(0, 3)) {
    console.log(`   - ${r.id.slice(0, 20)}...: ${r.benchmark} (${r.status})`);
  }
  console.log();

  // Summary
  console.log("=== Results ===");
  console.log(`Run found: ${run ? "✓" : "✗"}`);
  console.log(`Run completed: ${run?.status === "completed" ? "✓" : "✗"}`);
  console.log(`Steps saved: ${steps.length > 0 ? "✓" : "✗"} (${steps.length})`);
  console.log(
    `Tool calls saved: ${toolCalls.length > 0 ? "✓" : "✗"} (${toolCalls.length})`
  );
  console.log(`Analyzer load: ${logs.length > 0 ? "✓" : "✗"} (${logs.length})`);

  const allPassed =
    run !== undefined &&
    run.status === "completed" &&
    steps.length === 4 &&
    toolCalls.length === 1 &&
    logs.length === 4;

  if (allPassed) {
    console.log("\n✅ Integration test PASSED!");
  } else {
    console.log("\n❌ Integration test FAILED");
    process.exit(1);
  }
};

main().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
