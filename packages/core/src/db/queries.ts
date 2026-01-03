/**
 * Database Queries
 *
 * Insert and query functions for benchmark results.
 */

import { getDb } from "./client.js";
import type { LogData, Run, Step, ToolCall } from "./types.js";

const insertRun = async (run: {
  id: string;
  benchmark: string;
  model: string;
}): Promise<void> => {
  const db = await getDb();
  await db
    .prepare(
      "INSERT INTO runs (id, benchmark, model, started_at, status) VALUES (?, ?, ?, ?, ?)"
    )
    .run(run.id, run.benchmark, run.model, new Date().toISOString(), "running");
};

type RunUsageTotals = {
  inputTokens: number;
  outputTokens: number;
  cost: number;
};

const completeRun = async (
  id: string,
  finalScore: number,
  usage?: RunUsageTotals
): Promise<void> => {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE runs SET
        ended_at = ?,
        final_score = ?,
        status = ?,
        total_input_tokens = ?,
        total_output_tokens = ?,
        total_cost = ?
      WHERE id = ?`
    )
    .run(
      new Date().toISOString(),
      finalScore,
      "completed",
      usage?.inputTokens ?? 0,
      usage?.outputTokens ?? 0,
      usage?.cost ?? 0,
      id
    );
};

const failRun = async (id: string): Promise<void> => {
  const db = await getDb();
  await db
    .prepare("UPDATE runs SET ended_at = ?, status = ? WHERE id = ?")
    .run(new Date().toISOString(), "failed", id);
};

type InsertStepParams = {
  runId: string;
  stepNumber: number;
  type: string;
  data?: LogData;
};

const insertStep = async (step: InsertStepParams): Promise<number> => {
  const db = await getDb();
  const result = await db
    .prepare(
      "INSERT INTO steps (run_id, step_number, type, timestamp, data) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      step.runId,
      step.stepNumber,
      step.type,
      new Date().toISOString(),
      step.data ? JSON.stringify(step.data) : null
    );
  return Number(result.lastInsertRowid);
};

type InsertToolCallParams = {
  runId: string;
  stepId?: number;
  toolName: string;
  input?: LogData;
  output?: LogData;
  durationMs?: number;
};

const insertToolCall = async (call: InsertToolCallParams): Promise<void> => {
  const db = await getDb();
  await db
    .prepare(
      "INSERT INTO tool_calls (run_id, step_id, tool_name, input, output, duration_ms) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(
      call.runId,
      call.stepId ?? null,
      call.toolName,
      call.input ? JSON.stringify(call.input) : null,
      call.output ? JSON.stringify(call.output) : null,
      call.durationMs ?? null
    );
};

type InsertUsageParams = {
  runId: string;
  stepId?: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
};

const insertUsage = async (params: InsertUsageParams): Promise<void> => {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO usage (run_id, step_id, input_tokens, output_tokens,
        cache_read_tokens, cache_write_tokens, reasoning_tokens, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      params.runId,
      params.stepId ?? null,
      params.inputTokens,
      params.outputTokens,
      params.cacheReadTokens ?? null,
      params.cacheWriteTokens ?? null,
      params.reasoningTokens ?? null,
      new Date().toISOString()
    );
};

type UsageTotals = {
  total_input: number;
  total_output: number;
};

const getRunUsage = async (runId: string): Promise<unknown[]> => {
  const db = await getDb();
  const rows = await db
    .prepare("SELECT * FROM usage WHERE run_id = ? ORDER BY id")
    .all(runId);
  return rows as unknown[];
};

const getRunTotalUsage = async (runId: string): Promise<UsageTotals | null> => {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT SUM(input_tokens) as total_input, SUM(output_tokens) as total_output
      FROM usage WHERE run_id = ?`
    )
    .get(runId);
  return row as UsageTotals | null;
};

const getRun = async (id: string): Promise<Run | undefined> => {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM runs WHERE id = ?").get(id);
  return row as Run | undefined;
};

const getRunSteps = async (runId: string): Promise<Step[]> => {
  const db = await getDb();
  const rows = await db
    .prepare("SELECT * FROM steps WHERE run_id = ? ORDER BY step_number")
    .all(runId);
  return rows as Step[];
};

const getRunToolCalls = async (runId: string): Promise<ToolCall[]> => {
  const db = await getDb();
  const rows = await db
    .prepare("SELECT * FROM tool_calls WHERE run_id = ? ORDER BY id")
    .all(runId);
  return rows as ToolCall[];
};

const getAllRuns = async (): Promise<Run[]> => {
  const db = await getDb();
  const rows = await db
    .prepare("SELECT * FROM runs ORDER BY started_at DESC")
    .all();
  return rows as Run[];
};

const getRecentRuns = async (limit = 10): Promise<Run[]> => {
  const db = await getDb();
  const rows = await db
    .prepare("SELECT * FROM runs ORDER BY started_at DESC LIMIT ?")
    .all(limit);
  return rows as Run[];
};

type InsertModelRequestParams = {
  runId: string;
  stepNumber: number;
  prompt: string;
  systemPrompt?: string;
};

const insertModelRequest = async (
  params: InsertModelRequestParams
): Promise<number> => {
  const db = await getDb();
  const result = await db
    .prepare(
      `INSERT INTO model_requests (run_id, step_number, prompt, system_prompt, timestamp)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      params.runId,
      params.stepNumber,
      params.prompt,
      params.systemPrompt ?? null,
      new Date().toISOString()
    );
  return Number(result.lastInsertRowid);
};

type InsertModelOutputParams = {
  runId: string;
  stepId: number;
  stepType?: string;
  finishReason?: string;
  text?: string;
  reasoningText?: string;
};

const insertModelOutput = async (
  params: InsertModelOutputParams
): Promise<number> => {
  const db = await getDb();
  const result = await db
    .prepare(
      `INSERT INTO model_outputs (run_id, step_id, step_type, finish_reason, text, reasoning_text, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      params.runId,
      params.stepId,
      params.stepType ?? null,
      params.finishReason ?? null,
      params.text ?? null,
      params.reasoningText ?? null,
      new Date().toISOString()
    );
  return Number(result.lastInsertRowid);
};

type InsertReasoningPartParams = {
  runId: string;
  outputId: number;
  partIndex: number;
  text: string;
};

const insertReasoningPart = async (
  params: InsertReasoningPartParams
): Promise<void> => {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO reasoning_parts (run_id, output_id, part_index, text, timestamp)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      params.runId,
      params.outputId,
      params.partIndex,
      params.text,
      new Date().toISOString()
    );
};

type ModelRequest = {
  id: number;
  run_id: string;
  step_number: number;
  prompt: string;
  system_prompt: string | null;
  timestamp: string;
};

type ModelOutput = {
  id: number;
  run_id: string;
  step_id: number;
  step_type: string | null;
  finish_reason: string | null;
  text: string | null;
  reasoning_text: string | null;
  timestamp: string;
};

type ReasoningPartRow = {
  id: number;
  run_id: string;
  output_id: number;
  part_index: number;
  text: string;
  timestamp: string;
};

const getRunRequests = async (runId: string): Promise<ModelRequest[]> => {
  const db = await getDb();
  const rows = await db
    .prepare("SELECT * FROM model_requests WHERE run_id = ? ORDER BY id")
    .all(runId);
  return rows as ModelRequest[];
};

const getRunModelOutputs = async (runId: string): Promise<ModelOutput[]> => {
  const db = await getDb();
  const rows = await db
    .prepare("SELECT * FROM model_outputs WHERE run_id = ? ORDER BY step_id")
    .all(runId);
  return rows as ModelOutput[];
};

const getStepsByFinishReason = async (
  runId: string,
  finishReason: string
): Promise<ModelOutput[]> => {
  const db = await getDb();
  const rows = await db
    .prepare(
      "SELECT * FROM model_outputs WHERE run_id = ? AND finish_reason = ? ORDER BY step_id"
    )
    .all(runId, finishReason);
  return rows as ModelOutput[];
};

const getReasoningParts = async (
  outputId: number
): Promise<ReasoningPartRow[]> => {
  const db = await getDb();
  const rows = await db
    .prepare(
      "SELECT * FROM reasoning_parts WHERE output_id = ? ORDER BY part_index"
    )
    .all(outputId);
  return rows as ReasoningPartRow[];
};

const searchReasoningParts = async (
  runId: string,
  searchText: string
): Promise<ReasoningPartRow[]> => {
  const db = await getDb();
  const rows = await db
    .prepare(
      "SELECT * FROM reasoning_parts WHERE run_id = ? AND text LIKE ? ORDER BY id"
    )
    .all(runId, `%${searchText}%`);
  return rows as ReasoningPartRow[];
};

export {
  insertRun,
  completeRun,
  failRun,
  insertStep,
  insertToolCall,
  insertUsage,
  insertModelRequest,
  insertModelOutput,
  insertReasoningPart,
  getRun,
  getRunSteps,
  getRunToolCalls,
  getRunUsage,
  getRunTotalUsage,
  getAllRuns,
  getRecentRuns,
  getRunRequests,
  getRunModelOutputs,
  getStepsByFinishReason,
  getReasoningParts,
  searchReasoningParts,
};

export type { LogData, Run, Step, ToolCall, UsageRow } from "./types.js";
export type { ModelRequest, ModelOutput, ReasoningPartRow };
