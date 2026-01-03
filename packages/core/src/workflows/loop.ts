/**
 * Benchmark Simulation Loop
 *
 * Agent acts → Simulation advances → Repeat until termination or max steps.
 */

import type { GatewayProviderOptions } from "@ai-sdk/gateway";
import { tools } from "@quaver/core/agent";
import { SYSTEM_PROMPT } from "@quaver/core/agent/prompts";
import { MAX_STEPS } from "@quaver/core/config/constants";
import { createInitialState } from "@quaver/core/config/init";
import type { YourBenchmarkState } from "@quaver/core/config/types";
import { initSchema } from "@quaver/core/db/schema";
import { calculateScore, isTerminated } from "@quaver/core/engine/scoring";
import { advanceStep } from "@quaver/core/engine/step";
import { createLogger } from "@quaver/core/logging/logger";
import type { AgentStep, LogPreset } from "@quaver/core/logging/types";
import type { StepLog } from "@quaver/core/types/results";
import { fetchAllGenerationCosts } from "@quaver/core/utils/cost";
import { hasToolCall, stepCountIs, ToolLoopAgent } from "ai";

type BenchmarkResult = {
  runId: string;
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

/**
 * Provider options for benchmark runs.
 * Uses GatewayProviderOptions for typed gateway config.
 * Other providers use Record<string, unknown> until their packages are installed.
 */
type BenchmarkProviderOptions = {
  gateway?: GatewayProviderOptions;
  google?: Record<string, unknown>;
  anthropic?: Record<string, unknown>;
  openai?: Record<string, unknown>;
};

type BenchmarkOptions = {
  onStepComplete?: (step: number, score: number) => void;
  verbose?: boolean;
  persist?: boolean;
  logLevel?: LogPreset;
  benchmark?: string;
  providerOptions?: BenchmarkProviderOptions;
};

/** Default gateway options - zeroDataRetention for privacy */
const DEFAULT_GATEWAY_OPTIONS: GatewayProviderOptions = {
  zeroDataRetention: true,
};

const MAX_TOOL_CALLS_PER_STEP = 100;
const MAX_MESSAGES = 50;
const KEEP_MESSAGES = 40;

type GatewayData = { cost?: string; generationId?: string };
type ResponseWithGateway = {
  body?: { providerMetadata?: { gateway?: GatewayData } };
};

const getGatewayData = (response: unknown): GatewayData =>
  (response as ResponseWithGateway)?.body?.providerMetadata?.gateway ?? {};

const runBenchmark = async (
  modelId = "openai/gpt-5.2",
  options?: BenchmarkOptions
): Promise<BenchmarkResult> => {
  const startedAt = new Date();
  const state = createInitialState();
  const stepLog: StepLog[] = [];
  const benchmarkName = options?.benchmark ?? "loop";
  const runId = crypto.randomUUID();

  if (options?.persist) {
    await initSchema();
  }

  const logger = createLogger(options?.logLevel ?? "normal", {
    persist: options?.persist ?? false,
    runId,
    benchmark: benchmarkName,
    model: modelId,
    pretty: options?.verbose ?? true,
  });

  logger.start({ benchmark: benchmarkName, model: modelId });

  const generationIds: string[] = [];
  const loggerStepHook = logger.createStepHook();

  const agent = new ToolLoopAgent({
    model: modelId,
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

    onStepFinish: (stepResult) => {
      const step: AgentStep = {
        text: stepResult.text,
        toolCalls: stepResult.toolCalls?.map((tc) => ({
          toolName: tc.toolName,
          input: tc.input,
        })),
        toolResults: stepResult.toolResults?.map((tr) => ({
          output: tr.output,
        })),
        usage: stepResult.usage,
        reasoning: stepResult.reasoning,
        reasoningText: stepResult.reasoningText,
        finishReason: stepResult.finishReason,
      };
      loggerStepHook(step);

      const gateway = getGatewayData(stepResult.response);
      if (gateway.generationId) {
        generationIds.push(gateway.generationId);
      }
    },
  });

  // Merge default gateway options (zeroDataRetention) with user options
  const mergedProviderOptions = {
    ...options?.providerOptions,
    gateway: {
      ...DEFAULT_GATEWAY_OPTIONS,
      ...options?.providerOptions?.gateway,
    },
  };

  logger.request("Begin the simulation.", SYSTEM_PROMPT);
  logger.progress(1, MAX_STEPS, "Starting simulation");
  await agent.generate({
    prompt: "Begin the simulation.",
  });

  while (!isTerminated(state) && state.step <= MAX_STEPS) {
    const report = advanceStep(state);

    stepLog.push({
      step: state.step,
      score: report.score,
    });

    if (options?.onStepComplete) {
      options.onStepComplete(state.step, report.score);
    }

    logger.progress(state.step, MAX_STEPS);

    const stepSummary = formatStepSummary(report, state);
    logger.request(stepSummary);
    await agent.generate({
      prompt: stepSummary,
    });
  }

  const endedAt = new Date();
  const elapsedSeconds = (endedAt.getTime() - startedAt.getTime()) / 1000;
  const finalScore = calculateScore(state);

  logger.progress(state.step, MAX_STEPS, "Fetching cost data from API...");
  const costResult = await fetchAllGenerationCosts(generationIds);

  logger.end({
    finalScore,
    gatewayCost: costResult.totalCost,
  });

  return {
    runId,
    finalStep: state.step,
    score: finalScore,
    terminated: isTerminated(state),
    stepLog,
    model: modelId,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    elapsedSeconds,
  };
};

type StepReport = ReturnType<typeof advanceStep>;

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
export type { BenchmarkResult, BenchmarkOptions, BenchmarkProviderOptions };
