/**
 * Benchmark Simulation Loop
 *
 * Agent acts → Simulation advances → Repeat until termination or max steps.
 *
 * [TODO]: Customize for your scenario
 */

import { tools } from "@quaver/core/agent";
import { SYSTEM_PROMPT } from "@quaver/core/agent/prompts";
import { MAX_STEPS } from "@quaver/core/config/constants";
import { createInitialState } from "@quaver/core/config/init";
import type { YourBenchmarkState } from "@quaver/core/config/types";
import { calculateScore, isTerminated } from "@quaver/core/engine/scoring";
import { advanceStep } from "@quaver/core/engine/step";
import type { StepLog } from "@quaver/core/types/results";
import { Experimental_Agent as Agent, hasToolCall, stepCountIs } from "ai";

type BenchmarkResult = {
  finalStep: number;
  score: number;
  terminated: boolean;
  stepLog: StepLog[];
  model: string;
  startedAt: string;
  endedAt: string;
  elapsedSeconds: number;
  interrupted?: boolean;
};

/** Maximum tool calls per step */
const MAX_TOOL_CALLS_PER_STEP = 100;

/** Maximum messages before context trimming */
const MAX_MESSAGES = 50;

/** Messages to keep after trimming */
const KEEP_MESSAGES = 40;

type LogFn = (msg: string) => void;

const logToolCall = (
  log: LogFn,
  toolName: string,
  input: unknown,
  output: unknown
): void => {
  log(`\n[Tool: ${toolName}]`);
  log(`   Args: ${JSON.stringify(input ?? {}, null, 2)}`);

  if (output === undefined) {
    return;
  }

  const resultStr = JSON.stringify(output, null, 2);
  const truncated = resultStr.length > 500;
  log(`   Result: ${truncated ? `${resultStr.slice(0, 500)}...` : resultStr}`);
};

/**
 * Run the benchmark simulation.
 *
 * @param modelId - Model to use
 * @param onStepComplete - Optional callback for progress updates
 * @param verbose - Enable verbose logging
 * @returns BenchmarkResult with final metrics
 */
const runBenchmark = async (
  modelId = "openai/gpt-5.2",
  onStepComplete?: (step: number, score: number) => void,
  verbose = true
): Promise<BenchmarkResult> => {
  const state = createInitialState();
  const stepLog: StepLog[] = [];

  const log: LogFn = (msg: string) => {
    if (verbose) {
      console.log(msg);
    }
  };

  const agent = new Agent({
    model: modelId,
    system: SYSTEM_PROMPT,
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

    onStepFinish: (agentStep) => {
      if (!verbose) {
        return;
      }

      if (agentStep.text) {
        log(`\n[Model says]:\n${agentStep.text}\n`);
      }

      if (!agentStep.toolCalls || agentStep.toolCalls.length === 0) {
        return;
      }

      for (let i = 0; i < agentStep.toolCalls.length; i += 1) {
        const tc = agentStep.toolCalls[i];
        const tr = agentStep.toolResults?.[i];
        if (tc) {
          logToolCall(log, tc.toolName, tc.input, tr?.output);
        }
      }
    },
  });

  // Initial prompt
  log(`\n${"=".repeat(50)}`);
  log("STEP 1 - Starting simulation");
  log("=".repeat(50));

  await agent.generate({
    prompt: "Begin the simulation.", // [TODO]: Customize initial prompt
  });

  // Main simulation loop
  while (!isTerminated(state) && state.step <= MAX_STEPS) {
    const report = advanceStep(state);

    stepLog.push({
      step: state.step,
      score: report.score,
    });

    if (onStepComplete) {
      onStepComplete(state.step, report.score);
    }

    log(`\n${"=".repeat(50)}`);
    log(`STEP ${state.step} - Score: ${report.score}`);
    log("=".repeat(50));

    const stepSummary = formatStepSummary(report, state);
    await agent.generate({ prompt: stepSummary });
  }

  return {
    finalStep: state.step,
    score: calculateScore(state),
    terminated: isTerminated(state),
    stepLog,
    model: modelId,
    startedAt: "",
    endedAt: "",
    elapsedSeconds: 0,
  };
};

type StepReport = ReturnType<typeof advanceStep>;

/**
 * Format step summary for agent prompt.
 * [TODO]: Customize based on your simulation.
 */
const formatStepSummary = (
  report: StepReport,
  state: YourBenchmarkState
): string => {
  const lines = [`Step ${state.step} has begun.`];

  if (report.cost.paid) {
    lines.push(`Step cost of ${report.cost.amount} applied.`);
  } else {
    lines.push(
      `Step cost not applied (${state.failureCount} consecutive failures).`
    );
  }

  lines.push(`Current score: ${state.score}.`);

  return lines.join(" ");
};

export { runBenchmark };
export type { BenchmarkResult };
