/**
 * Results Utility
 *
 * Save and load benchmark results to/from JSON files.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BenchmarkResult } from "@quaver/core/types/results";

/**
 * Save a benchmark result to a JSON file.
 *
 * @param result - The benchmark result to save
 * @param dir - Directory to save results in
 * @returns Path to the saved file
 */
const saveResult = (result: BenchmarkResult, dir: string): string => {
  mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const modelSlug = result.model.replace(/\//g, "_");
  const filename = `${timestamp}_${modelSlug}.json`;
  const filepath = join(dir, filename);

  writeFileSync(filepath, JSON.stringify(result, null, 2));
  return filepath;
};

/**
 * Load all benchmark results from a directory.
 *
 * @param dir - Directory to load results from
 * @returns Array of benchmark results
 */
const loadResults = (dir: string): BenchmarkResult[] => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const results: BenchmarkResult[] = [];

  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf-8");
    const result = JSON.parse(content) as BenchmarkResult;
    results.push(result);
  }

  return results;
};

export { loadResults, saveResult };
