/**
 * Benchmark Entry Point
 *
 * Main file that runs the benchmark simulation.
 *
 * [TODO]: Customize the benchmark loop for your scenario
 */

import { createLogger } from "@quaver/core/logging/logger";
import { memoryTools } from "@quaver/core/tools/memory";
import { adjustScoreTool, getScoreTool } from "@quaver/core/tools/score";
import { waitForNextStepTool } from "@quaver/core/tools/time";
import type { BenchmarkResult } from "@quaver/core/types/results";
import { hasToolCall, stepCountIs, ToolLoopAgent } from "ai";
import { MAX_STEPS } from "./config/constants.js";
import { createInitialState } from "./config/init.js";
import { isTerminated } from "./engine/scoring.js";
import { advanceStep } from "./engine/step.js";
import { INITIAL_PROMPT, SYSTEM_PROMPT } from "./prompts.js";
import { customTools } from "./tools/custom.js";

const MAX_MESSAGES = 50;
const KEEP_MESSAGES = 40;
const MAX_TOOL_CALLS_PER_STEP = 100;

/**
 * Run the benchmark simulation.
 *
 * @param model - Model ID to use (e.g., "anthropic/claude-sonnet-4.5")
 * @param verbose - Whether to log progress (default: true)
 * @returns Benchmark results
 */
export async function runBenchmark(
  model = "anthropic/claude-sonnet-4.5",
  verbose = true
): Promise<BenchmarkResult> {
  const state = createInitialState();
  const logger = createLogger(verbose ? "normal" : "silent");

  const log = (msg: string) => {
    if (verbose) {
      console.log(msg);
    }
  };

  // Combine framework tools with custom tools
  const tools = {
    // Framework tools (from @quaver/core)
    getScore: getScoreTool,
    adjustScore: adjustScoreTool,
    waitForNextStep: waitForNextStepTool,
    ...memoryTools,

    // Custom tools (your scenario-specific tools)
    ...customTools,
  };

  const agent = new ToolLoopAgent({
    model,
    instructions: SYSTEM_PROMPT,
    tools,
    experimental_context: state,
    stopWhen: [
      hasToolCall("waitForNextStep"),
      stepCountIs(MAX_TOOL_CALLS_PER_STEP),
    ],

    prepareStep: ({ messages }) => {
      if (messages.length > MAX_MESSAGES) {
        const systemMessage = messages[0];
        const recentMessages = messages.slice(-KEEP_MESSAGES);
        if (systemMessage) {
          return { messages: [systemMessage, ...recentMessages] };
        }
      }
      return {};
    },

    onStepFinish: logger.createStepHook(),
  });

  log(`🚀 Starting benchmark with model: ${model}`);
  log(`📊 Initial score: ${state.score}`);

  // Initial prompt
  await agent.generate({ prompt: INITIAL_PROMPT });

  // Main simulation loop
  while (!isTerminated(state) && state.step <= MAX_STEPS) {
    const report = advanceStep(state);

    log(`📅 Step ${report.step}: Score ${report.score}`);

    // [TODO]: Format step summary for your scenario
    const stepSummary = `Step ${report.step} complete. Score: ${report.score}. Continue.`;

    await agent.generate({ prompt: stepSummary });
  }

  const terminated = isTerminated(state);
  const endedAt = new Date().toISOString();

  log("\n✅ Benchmark complete!");
  log(`📊 Final score: ${state.score}`);
  log(`📅 Total steps: ${state.step}`);
  log(`💀 Terminated early: ${terminated}`);

  return {
    model,
    finalStep: state.step,
    score: state.score,
    terminated,
    stepLog: [], // [TODO]: Track step-by-step progress
    startedAt: new Date().toISOString(), // [TODO]: Track actual start time
    endedAt,
    elapsedSeconds: 0, // [TODO]: Track elapsed time
  };
}

// Run if executed directly
if (import.meta.main) {
  runBenchmark().catch(console.error);
}
