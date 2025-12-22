/**
 * Database Schema
 *
 * Initializes the benchmark results database tables.
 */

import { getDb } from "./client.js";

const initSchema = async (): Promise<void> => {
  const db = await getDb();

  // Benchmark runs
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      benchmark TEXT NOT NULL,
      model TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      final_score REAL,
      status TEXT DEFAULT 'running'
    )
  `);

  // Steps (tool calls, thinking, transitions)
  db.exec(`
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

  // Tool calls (denormalized for fast queries)
  db.exec(`
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
};

export { initSchema };
