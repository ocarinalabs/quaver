/**
 * Vending-Bench
 *
 * A 365-day simulation benchmark where an AI agent manages a vending machine business.
 * Based on the Andon Labs research paper.
 */

export { createVendingAgent, tools } from "./agent.js";
export { runBenchmark } from "./benchmark.js";
export type { VendingState } from "./core/types.js";
