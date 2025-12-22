/**
 * Vending-Bench Benchmark
 *
 * 365-day simulation where an AI agent manages a vending machine business.
 * Agent acts → Simulation advances → Repeat until bankruptcy or day 365.
 *
 * Paper: "Models are tasked with running a simulated vending machine
 * business over a year and scored on their bank account balance at the end."
 */

import { SIMULATION_DAYS } from "@vending/config/constants.js";
import { SYSTEM_PROMPT } from "@vending/config/prompts.js";
import { createInitialState } from "@vending/core/state.js";
import { advanceDay } from "@vending/simulation/index.js";
import { calculateNetWorth, isBankrupt } from "@vending/simulation/scoring.js";
import { Experimental_Agent as Agent, hasToolCall, stepCountIs } from "ai";
import { tools } from "./agent.js";

// --- Types ---

type DayLog = {
  day: number;
  balance: number;
  netWorth: number;
  unitsSold: number;
  revenue: number;
  feePaid: boolean;
  storageItems: number;
  pendingOrders: number;
};

type BenchmarkResult = {
  finalDay: number;
  netWorth: number;
  bankrupt: boolean;
  totalUnitsSold: number;
  totalRevenue: number;
  dailyLog: DayLog[];
};

// --- Constants ---

/** Maximum steps per agent.generate() call */
const MAX_STEPS_PER_DAY = 100;

/** Maximum messages before context trimming */
const MAX_MESSAGES = 50;

/** Messages to keep after trimming */
const KEEP_MESSAGES = 40;

// --- Logging Helpers ---

type LogFn = (msg: string) => void;

/**
 * Log a single tool call with its result
 */
const logToolCall = (
  log: LogFn,
  toolName: string,
  input: unknown,
  output: unknown
): void => {
  log(`\n🔧 [Tool: ${toolName}]`);
  log(`   Args: ${JSON.stringify(input ?? {}, null, 2)}`);

  if (output === undefined) {
    return;
  }

  const resultStr = JSON.stringify(output, null, 2);
  const truncated = resultStr.length > 500;
  log(`   Result: ${truncated ? `${resultStr.slice(0, 500)}...` : resultStr}`);
};

// --- Benchmark ---

/**
 * Run the Vending-Bench simulation
 *
 * @param modelId - Model to use (default: anthropic/claude-sonnet-4.5)
 * @param onDayComplete - Optional callback for progress updates
 * @returns BenchmarkResult with final metrics
 */
export const runBenchmark = async (
  modelId = "anthropic/claude-sonnet-4.5",
  onDayComplete?: (day: number, netWorth: number) => void,
  verbose = true
): Promise<BenchmarkResult> => {
  const state = createInitialState();
  let totalUnitsSold = 0;
  let totalRevenue = 0;
  const dailyLog: DayLog[] = [];

  const log: LogFn = (msg: string) => {
    if (verbose) {
      console.log(msg);
    }
  };

  // Create agent with loop control
  const agent = new Agent({
    model: modelId,
    system: SYSTEM_PROMPT,
    tools,
    experimental_context: state,

    // Stop when day ends OR safety limit
    stopWhen: [hasToolCall("waitForNextDay"), stepCountIs(MAX_STEPS_PER_DAY)],

    // Context management for long runs
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

    // Verbose logging
    onStepFinish: (step) => {
      if (!verbose) {
        return;
      }

      // Log agent's thinking/text
      if (step.text) {
        log(`\n💭 [Model says]:\n${step.text}\n`);
      }

      // Log tool calls with results
      if (!step.toolCalls || step.toolCalls.length === 0) {
        return;
      }

      for (let i = 0; i < step.toolCalls.length; i += 1) {
        const tc = step.toolCalls[i];
        const tr = step.toolResults?.[i];
        if (tc) {
          logToolCall(log, tc.toolName, tc.input, tr?.output);
        }
      }
    },
  });

  // Initial prompt - start day 1
  log(`\n${"=".repeat(50)}`);
  log("DAY 1 - Starting simulation");
  log("=".repeat(50));

  await agent.generate({
    prompt: "You are now managing the vending machine. Begin your first day.",
  });

  // Main simulation loop (paper: up to 365 days)
  while (!isBankrupt(state) && state.day <= SIMULATION_DAYS) {
    // Advance simulation: fee → sales → day++
    const report = await advanceDay(state);

    // Track totals
    const dayUnits = report.sales.reduce((sum, s) => sum + s.quantity, 0);
    totalUnitsSold += dayUnits;
    totalRevenue += report.totalRevenue;

    // Record daily log
    const storageItems = state.storage.reduce((sum, s) => sum + s.quantity, 0);
    const pendingOrders = state.pendingOrders.filter(
      (o) => !o.delivered
    ).length;
    dailyLog.push({
      day: state.day,
      balance: state.balance,
      netWorth: report.netWorth,
      unitsSold: dayUnits,
      revenue: report.totalRevenue,
      feePaid: report.fee.paid,
      storageItems,
      pendingOrders,
    });

    // Progress callback
    if (onDayComplete) {
      onDayComplete(state.day, report.netWorth);
    }

    // Log day transition
    log(`\n${"=".repeat(50)}`);
    log(`DAY ${state.day} - Net worth: $${report.netWorth.toFixed(2)}`);
    log("=".repeat(50));
    log(`  Fee: ${report.fee.paid ? `$${report.fee.amount} paid` : "UNPAID!"}`);
    log(
      `  Sales: ${dayUnits} units, $${report.totalRevenue.toFixed(2)} revenue`
    );
    log(`  Balance: $${state.balance.toFixed(2)}`);

    // Format day summary for agent
    const daySummary = formatDaySummary(report, state);

    // Agent continues for next day
    await agent.generate({ prompt: daySummary });
  }

  return {
    finalDay: state.day,
    netWorth: calculateNetWorth(state),
    bankrupt: isBankrupt(state),
    totalUnitsSold,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    dailyLog,
  };
};

// --- Helpers ---

type DayReport = Awaited<ReturnType<typeof advanceDay>>;

/**
 * Format day summary for agent prompt
 */
const formatDaySummary = (
  report: DayReport,
  state: { day: number; balance: number; consecutiveDaysUnpaid: number }
): string => {
  const lines = [`Day ${state.day} has begun.`];

  // Fee status
  if (report.fee.paid) {
    lines.push(`Daily fee of $${report.fee.amount} paid.`);
  } else {
    lines.push(
      `WARNING: Unable to pay daily fee! (${state.consecutiveDaysUnpaid} days unpaid)`
    );
  }

  // Sales summary
  if (report.sales.length > 0) {
    const units = report.sales.reduce((sum, s) => sum + s.quantity, 0);
    lines.push(
      `Yesterday: ${units} units sold for $${report.totalRevenue.toFixed(2)}.`
    );
  } else {
    lines.push("Yesterday: No sales.");
  }

  // Balance
  lines.push(`Current balance: $${state.balance.toFixed(2)}.`);

  return lines.join(" ");
};

export type { BenchmarkResult, DayLog };
