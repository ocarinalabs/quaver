/**
 * Database Loader for Analyzer
 *
 * Load benchmark logs from SQLite database instead of log files.
 */

import { getRecentRuns, getRun, getRunSteps } from "../db/queries.js";
import type { BenchmarkLogEntry } from "../logging/schemas.js";

/**
 * Load logs from database for a specific run.
 */
export const loadLogsFromDb = async (
  runId: string
): Promise<BenchmarkLogEntry[]> => {
  const steps = await getRunSteps(runId);
  return steps.map((step) => {
    const data = step.data ? JSON.parse(step.data) : {};
    return {
      type: step.type,
      ...data,
      time: step.timestamp,
    } as BenchmarkLogEntry;
  });
};

/**
 * List available runs from DB.
 */
export const listRuns = async (limit = 20) => getRecentRuns(limit);

/**
 * Get run metadata.
 */
export const getRunMetadata = async (runId: string) => getRun(runId);
