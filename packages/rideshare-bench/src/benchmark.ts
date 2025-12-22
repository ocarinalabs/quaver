/**
 * Rideshare Benchmark
 *
 * 168-hour (7-day) simulation where an AI agent works as a rideshare driver.
 * Agent decides zones, accepts rides, manages fuel → Simulation advances → Repeat.
 *
 * Score: Net earnings (balance + pending tips) at the end of 7 days.
 */

import { Experimental_Agent as Agent, hasToolCall, stepCountIs } from "ai";
import { tools } from "./agent/index.js";
import { SYSTEM_PROMPT } from "./agent/prompts.js";
import {
  BANKRUPTCY_THRESHOLD,
  DEACTIVATION_RATING,
  SIMULATION_HOURS,
  ZONE_NAMES,
} from "./config/constants.js";
import { createInitialState } from "./config/init.js";
import type { RideshareState } from "./config/types.js";
import { advanceHour, calculateScore } from "./simulation/step.js";

// --- Types ---

type HourLog = {
  hour: number;
  day: number;
  balance: number;
  score: number;
  ridesCompleted: number;
  fuelLevel: number;
  rating: number;
  zone: string;
};

type BenchmarkResult = {
  success: boolean;
  finalScore: number;
  hoursCompleted: number;
  totalRides: number;
  finalBalance: number;
  finalRating: number;
  terminationReason: "completed" | "bankruptcy" | "deactivation" | "error";
  hourlyLog: HourLog[];
  transcript: string[];
  error?: string;
};

// --- Constants ---

/** Maximum steps per agent.generate() call */
const MAX_STEPS_PER_HOUR = 100;

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

// --- Termination ---

/** Check termination conditions */
const checkTermination = (
  state: RideshareState
): { terminated: boolean; reason: BenchmarkResult["terminationReason"] } => {
  if (state.balance < BANKRUPTCY_THRESHOLD) {
    return { terminated: true, reason: "bankruptcy" };
  }
  if (state.profile.rating < DEACTIVATION_RATING) {
    return { terminated: true, reason: "deactivation" };
  }
  return { terminated: false, reason: "completed" };
};

// --- Benchmark ---

/**
 * Run the Rideshare Benchmark simulation
 *
 * @param modelId - Model to use (default: anthropic/claude-sonnet-4.5)
 * @param onHourComplete - Optional callback for progress updates
 * @param verbose - Enable verbose logging (default: true)
 * @returns BenchmarkResult with final metrics
 */
const runBenchmark = async (
  modelId = "anthropic/claude-sonnet-4.5",
  onHourComplete?: (hour: number, day: number, score: number) => void,
  verbose = true,
  sharedTranscript?: string[]
): Promise<BenchmarkResult> => {
  const state = createInitialState();
  const hourlyLog: HourLog[] = [];
  const transcript = sharedTranscript ?? [];

  const log: LogFn = (msg: string) => {
    transcript.push(msg); // Always capture to transcript
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

    // Stop when hour ends OR safety limit
    stopWhen: [hasToolCall("waitForNextHour"), stepCountIs(MAX_STEPS_PER_HOUR)],

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

  let terminationReason: BenchmarkResult["terminationReason"] = "completed";

  // Initial prompt - start hour 1
  log(`\n${"═".repeat(60)}`);
  log("RIDESHARE BENCHMARK");
  log(`Model: ${modelId}`);
  log("═".repeat(60));
  log(`\n${"=".repeat(50)}`);
  log("HOUR 1 - Starting simulation");
  log("=".repeat(50));

  try {
    await agent.generate({
      prompt:
        "You are now driving for RideShare Plus. It's the start of your shift. Begin your first hour.",
    });

    // Main simulation loop (168 hours = 7 days)
    while (
      state.hour < SIMULATION_HOURS &&
      !checkTermination(state).terminated
    ) {
      // Advance simulation when agent is waiting
      if (state.waitingForNextHour) {
        advanceHour(state);
      }

      // Check termination after hour advance
      const termCheck = checkTermination(state);
      if (termCheck.terminated) {
        terminationReason = termCheck.reason;
        log(`\n⚠️  TERMINATED: ${termCheck.reason}`);
        break;
      }

      // Record hourly log
      const score = calculateScore(state);
      hourlyLog.push({
        hour: state.hour,
        day: state.day,
        balance: state.balance,
        score,
        ridesCompleted: state.profile.totalRides,
        fuelLevel: state.vehicle.fuelLevel,
        rating: state.profile.rating,
        zone: ZONE_NAMES[state.currentZone],
      });

      // Progress callback
      if (onHourComplete) {
        onHourComplete(state.hour, state.day, score);
      }

      // Log hour transition
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayName = dayNames[state.dayOfWeek] ?? "???";
      const totalHours = (state.day - 1) * 24 + state.hour;

      log(`\n${"=".repeat(50)}`);
      log(
        `HOUR ${totalHours + 1}/${SIMULATION_HOURS} - Day ${state.day} (${dayName}), ${state.hour}:00`
      );
      log("=".repeat(50));
      log(
        `  Balance: $${state.balance.toFixed(2)} | Score: $${score.toFixed(2)}`
      );
      log(
        `  Fuel: ${state.vehicle.fuelLevel.toFixed(1)}% | Rating: ${state.profile.rating.toFixed(2)}⭐`
      );
      log(
        `  Zone: ${ZONE_NAMES[state.currentZone]} | Shift: ${state.shiftStatus}`
      );
      log(
        `  Weather: ${state.weatherCondition} | Surge: ${state.surgeMultipliers[state.currentZone]?.toFixed(1)}x`
      );
      if (state.pendingRequests.length > 0) {
        log(`  Pending requests: ${state.pendingRequests.length}`);
      }

      // Format hour summary for agent
      const hourSummary = formatHourSummary(state);

      // Agent continues for next hour
      await agent.generate({ prompt: hourSummary });
    }

    const finalScore = calculateScore(state);

    log(`\n${"═".repeat(60)}`);
    log("BENCHMARK COMPLETE");
    log("═".repeat(60));
    log(`Final Score: $${finalScore.toFixed(2)}`);
    log(`Total Rides: ${state.profile.totalRides}`);
    log(`Final Rating: ${state.profile.rating.toFixed(2)}⭐`);
    log(
      `Hours Completed: ${(state.day - 1) * 24 + state.hour}/${SIMULATION_HOURS}`
    );
    log(`Termination: ${terminationReason}`);

    return {
      success: terminationReason === "completed",
      finalScore,
      hoursCompleted: (state.day - 1) * 24 + state.hour,
      totalRides: state.profile.totalRides,
      finalBalance: state.balance,
      finalRating: state.profile.rating,
      terminationReason,
      hourlyLog,
      transcript,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`\n❌ ERROR: ${errorMessage}`);

    return {
      success: false,
      finalScore: calculateScore(state),
      hoursCompleted: (state.day - 1) * 24 + state.hour,
      totalRides: state.profile.totalRides,
      finalBalance: state.balance,
      finalRating: state.profile.rating,
      terminationReason: "error",
      hourlyLog,
      transcript,
      error: errorMessage,
    };
  }
};

// --- Helpers ---

/**
 * Format hour summary for agent prompt
 */
const formatHourSummary = (state: RideshareState): string => {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = dayNames[state.dayOfWeek] ?? "???";

  const lines = [`Hour ${state.hour}:00, Day ${state.day} (${dayName}).`];

  // Status
  lines.push(`Balance: $${state.balance.toFixed(2)}.`);
  lines.push(`Fuel: ${state.vehicle.fuelLevel.toFixed(1)}%.`);
  lines.push(`Rating: ${state.profile.rating.toFixed(2)} stars.`);

  // Location
  lines.push(`Zone: ${ZONE_NAMES[state.currentZone]}.`);
  lines.push(`Weather: ${state.weatherCondition}.`);

  // Surge
  const surge = state.surgeMultipliers[state.currentZone];
  if (surge && surge > 1.0) {
    lines.push(`Surge: ${surge.toFixed(1)}x in your zone!`);
  }

  // Pending requests
  if (state.pendingRequests.length > 0) {
    lines.push(`${state.pendingRequests.length} ride request(s) available.`);
  }

  // Current ride
  if (state.currentRide) {
    lines.push(`Current ride status: ${state.currentRide.status}.`);
  }

  lines.push("What will you do?");

  return lines.join(" ");
};

export { runBenchmark };
export type { BenchmarkResult, HourLog };
