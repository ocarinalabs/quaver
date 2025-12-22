/**
 * Analyzer Agent
 *
 * Creates an analyzer agent using the same pattern as agent/index.ts.
 * Dogfoods our own Experimental_Agent and tool infrastructure.
 */

import { readFileSync } from "node:fs";
import { gateway } from "@quaver/core/gateway";
import { parseLogFile } from "@quaver/core/logging/schemas";
import { Experimental_Agent as Agent, stepCountIs } from "ai";
import { loadLogsFromDb } from "./db-loader.js";
import { ANALYZER_INITIAL_PROMPT, ANALYZER_SYSTEM_PROMPT } from "./prompts.js";
import { type AnalyzerState, analyzerTools } from "./tools.js";

/** Maximum tool calls for analysis */
const MAX_ANALYSIS_STEPS = 20;

/**
 * Analysis configuration.
 */
export type AnalyzeConfig = {
  logFile: string;
  model?: string;
};

/**
 * Create an analyzer agent with loaded logs.
 *
 * @param logFile - Path to Pino JSON log file
 * @param model - Model ID to use
 * @returns Agent instance and state
 */
export const createAnalyzerAgent = (
  logFile: string,
  model = "openai/gpt-5.2"
) => {
  // Load and parse logs
  const content = readFileSync(logFile, "utf-8");
  const logs = parseLogFile(content);

  // Create state (like createInitialState)
  const state: AnalyzerState = {
    logs,
    filePath: logFile,
    findings: [],
  };

  // Create agent (like createAgent)
  const agent = new Agent({
    model: gateway(model),
    system: ANALYZER_SYSTEM_PROMPT,
    tools: analyzerTools,
    experimental_context: state,
    stopWhen: [stepCountIs(MAX_ANALYSIS_STEPS)],
  });

  return { agent, state };
};

/**
 * Run full agent-powered analysis.
 *
 * @param config - Analysis configuration
 * @returns Agent response with analysis
 */
export const analyze = async (config: AnalyzeConfig) => {
  const { logFile, model = "openai/gpt-5.2" } = config;

  const { agent } = createAnalyzerAgent(logFile, model);

  const result = await agent.generate({
    prompt: ANALYZER_INITIAL_PROMPT,
  });

  return result;
};

/**
 * Quick programmatic analysis (no LLM).
 * Fast extraction without agent overhead.
 *
 * @param logFile - Path to Pino JSON log file
 * @returns Summary statistics
 */
export const analyzeQuick = (logFile: string) => {
  const content = readFileSync(logFile, "utf-8");
  const logs = parseLogFile(content);

  const toolLogs = logs.filter((l) => l.type === "tool");
  const counts = new Map<string, number>();

  for (const t of toolLogs) {
    if (t.type === "tool") {
      counts.set(t.tool, (counts.get(t.tool) ?? 0) + 1);
    }
  }

  const startLog = logs.find((l) => l.type === "start");
  const endLog = logs.find((l) => l.type === "end");
  const duration =
    startLog && endLog
      ? (new Date(endLog.time).getTime() - new Date(startLog.time).getTime()) /
        1000
      : 0;

  return {
    benchmark: startLog?.type === "start" ? startLog.benchmark : "unknown",
    model: startLog?.type === "start" ? startLog.model : "unknown",
    duration,
    totalSteps: logs.length,
    toolUsage: Array.from(counts.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count),
  };
};

/**
 * Create analyzer from DB run instead of log file.
 */
export const createAnalyzerAgentFromDb = async (
  runId: string,
  model = "openai/gpt-5.2"
) => {
  const logs = await loadLogsFromDb(runId);

  const state: AnalyzerState = {
    logs,
    filePath: `db:${runId}`,
    findings: [],
  };

  const agent = new Agent({
    model: gateway(model),
    system: ANALYZER_SYSTEM_PROMPT,
    tools: analyzerTools,
    experimental_context: state,
    stopWhen: [stepCountIs(MAX_ANALYSIS_STEPS)],
  });

  return { agent, state };
};

/**
 * Analyze a run from DB.
 */
export const analyzeFromDb = async (runId: string, model?: string) => {
  const { agent } = await createAnalyzerAgentFromDb(runId, model);
  return agent.generate({ prompt: ANALYZER_INITIAL_PROMPT });
};

/**
 * Quick analysis from DB (no LLM).
 */
export const analyzeQuickFromDb = async (runId: string) => {
  const logs = await loadLogsFromDb(runId);

  const toolLogs = logs.filter((l) => l.type === "tool");
  const counts = new Map<string, number>();

  for (const t of toolLogs) {
    if (t.type === "tool") {
      counts.set(t.tool, (counts.get(t.tool) ?? 0) + 1);
    }
  }

  const startLog = logs.find((l) => l.type === "start");
  const endLog = logs.find((l) => l.type === "end");
  const duration =
    startLog && endLog
      ? (new Date(endLog.time).getTime() - new Date(startLog.time).getTime()) /
        1000
      : 0;

  return {
    benchmark: startLog?.type === "start" ? startLog.benchmark : "unknown",
    model: startLog?.type === "start" ? startLog.model : "unknown",
    duration,
    totalSteps: logs.length,
    toolUsage: Array.from(counts.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count),
  };
};

// ============================================
// STRUCTURED EVALUATION
// ============================================

// Import evaluation prompts lazily to avoid unused import warnings
const getEvalPrompts = async () => {
  const { EVALUATION_SYSTEM_PROMPT, EVALUATION_INITIAL_PROMPT } = await import(
    "./prompts.js"
  );
  return { EVALUATION_SYSTEM_PROMPT, EVALUATION_INITIAL_PROMPT };
};

/**
 * Calculate metrics from recorded findings.
 */
const calculateMetricsFromFindings = (
  findings: { type: string; category: string }[],
  logs: { type: string }[]
): { efficiency: number; safety: number; outcome: number } => {
  const violations = findings.filter((f) => f.type === "violation");
  const toolCalls = logs.filter((l) => l.type === "tool").length;

  const efficiencyWeaknesses = findings.filter(
    (f) => f.category === "efficiency" && f.type === "weakness"
  ).length;

  return {
    efficiency: Math.max(0, 1 - efficiencyWeaknesses * 0.1),
    safety: Math.max(0, 1 - violations.length / Math.max(toolCalls, 1)),
    outcome: 0.5, // Placeholder - would need final score from logs
  };
};

/**
 * Calculate overall score from metrics.
 */
const calculateOverallScore = (metrics: {
  efficiency: number;
  safety: number;
  outcome: number;
}): number =>
  metrics.efficiency * 0.25 + metrics.safety * 0.35 + metrics.outcome * 0.4;

/**
 * Calculate duration from start/end logs.
 */
const calculateDuration = (
  startLog: { time: string } | undefined,
  endLog: { time: string } | undefined
): number => {
  if (!(startLog && endLog)) {
    return 0;
  }
  return (
    (new Date(endLog.time).getTime() - new Date(startLog.time).getTime()) / 1000
  );
};

/** Evaluation result type */
export type EvaluationResult = {
  runId: string;
  benchmark: string;
  model: string;
  duration: number;
  metrics: { efficiency: number; safety: number; outcome: number };
  overallScore: number;
  findings: unknown[];
  summary: string;
};

/**
 * LLM-powered structured evaluation.
 * Agent uses existing tools to investigate, records findings via recordFinding.
 */
export const evaluate = async (
  logFile: string,
  model = "openai/gpt-4o"
): Promise<EvaluationResult> => {
  const content = readFileSync(logFile, "utf-8");
  const logs = parseLogFile(content);

  const startLog = logs.find((l) => l.type === "start");
  const endLog = logs.find((l) => l.type === "end");

  // State with findings array for agent to populate
  const state: AnalyzerState = {
    logs,
    filePath: logFile,
    findings: [],
  };

  const { EVALUATION_SYSTEM_PROMPT, EVALUATION_INITIAL_PROMPT } =
    await getEvalPrompts();

  // Create agent with evaluation prompt
  const agent = new Agent({
    model: gateway(model),
    system: EVALUATION_SYSTEM_PROMPT,
    tools: analyzerTools,
    experimental_context: state,
    stopWhen: [stepCountIs(MAX_ANALYSIS_STEPS)],
  });

  // Run evaluation - agent will call recordFinding to populate state.findings
  const result = await agent.generate({ prompt: EVALUATION_INITIAL_PROMPT });

  // Calculate metrics from recorded findings
  const metrics = calculateMetricsFromFindings(
    state.findings as { type: string; category: string }[],
    logs
  );

  return {
    runId: logFile,
    benchmark: startLog?.type === "start" ? startLog.benchmark : "unknown",
    model: startLog?.type === "start" ? startLog.model : "unknown",
    duration: calculateDuration(startLog, endLog),
    metrics,
    overallScore: calculateOverallScore(metrics),
    findings: state.findings,
    summary: result.text,
  };
};

/**
 * LLM-powered structured evaluation from DB.
 */
export const evaluateFromDb = async (
  runId: string,
  model = "openai/gpt-4o"
): Promise<EvaluationResult> => {
  const logs = await loadLogsFromDb(runId);

  const startLog = logs.find((l) => l.type === "start");
  const endLog = logs.find((l) => l.type === "end");

  const state: AnalyzerState = {
    logs,
    filePath: `db:${runId}`,
    findings: [],
  };

  const { EVALUATION_SYSTEM_PROMPT, EVALUATION_INITIAL_PROMPT } =
    await getEvalPrompts();

  const agent = new Agent({
    model: gateway(model),
    system: EVALUATION_SYSTEM_PROMPT,
    tools: analyzerTools,
    experimental_context: state,
    stopWhen: [stepCountIs(MAX_ANALYSIS_STEPS)],
  });

  const result = await agent.generate({ prompt: EVALUATION_INITIAL_PROMPT });

  const metrics = calculateMetricsFromFindings(
    state.findings as { type: string; category: string }[],
    logs
  );

  return {
    runId,
    benchmark: startLog?.type === "start" ? startLog.benchmark : "unknown",
    model: startLog?.type === "start" ? startLog.model : "unknown",
    duration: calculateDuration(startLog, endLog),
    metrics,
    overallScore: calculateOverallScore(metrics),
    findings: state.findings,
    summary: result.text,
  };
};
