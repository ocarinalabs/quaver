/**
 * Database Queries
 *
 * Insert and query functions for benchmark results.
 */

import { getDb } from "./client.js";
import type { LogData, Run, Step, ToolCall } from "./types.js";

// Runs
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

const completeRun = async (id: string, finalScore: number): Promise<void> => {
  const db = await getDb();
  await db
    .prepare(
      "UPDATE runs SET ended_at = ?, final_score = ?, status = ? WHERE id = ?"
    )
    .run(new Date().toISOString(), finalScore, "completed", id);
};

const failRun = async (id: string): Promise<void> => {
  const db = await getDb();
  await db
    .prepare("UPDATE runs SET ended_at = ?, status = ? WHERE id = ?")
    .run(new Date().toISOString(), "failed", id);
};

/** Step insert parameters */
type InsertStepParams = {
  runId: string;
  stepNumber: number;
  type: string;
  data?: LogData;
};

// Steps
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

/** Tool call insert parameters */
type InsertToolCallParams = {
  runId: string;
  stepId?: number;
  toolName: string;
  input?: LogData;
  output?: LogData;
  durationMs?: number;
};

// Tool calls
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

// Queries
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

export {
  insertRun,
  completeRun,
  failRun,
  insertStep,
  insertToolCall,
  getRun,
  getRunSteps,
  getRunToolCalls,
  getAllRuns,
  getRecentRuns,
};

export type { LogData, Run, Step, ToolCall } from "./types.js";
