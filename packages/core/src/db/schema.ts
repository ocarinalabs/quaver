/**
 * Database Schema
 *
 * Initializes the benchmark results database tables.
 */

import { getDb } from "./client.js";

const initSchema = async (): Promise<void> => {
  const db = await getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      benchmark TEXT NOT NULL,
      model TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      final_score REAL,
      status TEXT DEFAULT 'running',
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      total_cost REAL DEFAULT 0
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      step_number INTEGER NOT NULL,
      type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      data TEXT,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tool_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      step_id INTEGER,
      tool_name TEXT NOT NULL,
      input TEXT,
      output TEXT,
      duration_ms INTEGER,
      FOREIGN KEY (run_id) REFERENCES runs(id),
      FOREIGN KEY (step_id) REFERENCES steps(id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      step_id INTEGER,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cache_read_tokens INTEGER,
      cache_write_tokens INTEGER,
      reasoning_tokens INTEGER,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES runs(id),
      FOREIGN KEY (step_id) REFERENCES steps(id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS model_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      step_number INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      system_prompt TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS model_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      step_id INTEGER NOT NULL,
      step_type TEXT,
      finish_reason TEXT,
      text TEXT,
      reasoning_text TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES runs(id),
      FOREIGN KEY (step_id) REFERENCES steps(id)
    )
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_model_outputs_finish_reason
    ON model_outputs(finish_reason)
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS reasoning_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      output_id INTEGER NOT NULL,
      part_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES runs(id),
      FOREIGN KEY (output_id) REFERENCES model_outputs(id)
    )
  `);
};

export { initSchema };
