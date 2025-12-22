/**
 * Day Advancement Simulation
 *
 * Simple orchestrator called after agent uses waitForNextDay tool.
 * Coordinates: fee charging → worker wages → customer sales → day increment
 *
 * This function is called FROM a workflow context (the main benchmark loop).
 * The LLM call in simulateSales becomes a durable step via workflow's fetch.
 */

import type { VendingState } from "@vending/core/types.js";
import type { SaleResult } from "./customers.js";
import { simulateSales } from "./customers.js";
import type { FeeResult } from "./fees.js";
import { chargeDailyFee } from "./fees.js";
import { calculateNetWorth } from "./scoring.js";
import { processDeliveries, processSupplierEmails } from "./suppliers.js";
import { finalizeWorkerExecutions } from "./worker-execution.js";
import type { WageResult } from "./worker-wages.js";
import { processWorkerWages } from "./worker-wages.js";

// --- Types ---

type DayReport = {
  day: number;
  fee: FeeResult;
  workerWages: WageResult;
  sales: SaleResult[];
  totalRevenue: number;
  netWorth: number;
};

// --- Day Advancement ---

/**
 * Advance simulation by one day
 *
 * Sequential flow:
 * 1. Finalize any active worker executions (workers can't span days)
 * 2. Charge daily fee ($2)
 * 3. Process worker wages
 * 4. Process supplier emails (generate overnight responses)
 * 5. Process deliveries (add items to storage)
 * 6. Simulate customer sales
 * 7. Increment day counter
 * 8. Reset waitingForNextDay flag
 *
 * @returns DayReport with fee status, worker wages, sales, and net worth
 */
export const advanceDay = async (state: VendingState): Promise<DayReport> => {
  console.log(`\n${"─".repeat(50)}`);
  console.log(`🌙 OVERNIGHT PROCESSING (Day ${state.day} → ${state.day + 1})`);
  console.log("─".repeat(50));

  // 1. Finalize any active worker executions (workers can't span days)
  finalizeWorkerExecutions(state);

  // 2. Charge daily fee
  const fee = chargeDailyFee(state);

  // 3. Process worker wages
  const workerWages = processWorkerWages(state);
  if (workerWages.totalPaid > 0) {
    console.log(`💰 Worker wages paid: $${workerWages.totalPaid.toFixed(2)}`);
  }
  if (workerWages.unpaidWorkers.length > 0) {
    console.log(`⚠️  Unpaid workers: ${workerWages.unpaidWorkers.join(", ")}`);
  }

  // 4. Process supplier emails (generate responses overnight)
  await processSupplierEmails(state);

  // 5. Process deliveries (add items to storage)
  processDeliveries(state);

  // 6. Simulate customer sales
  const sales = await simulateSales(state);
  const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);

  // 7. Advance day
  state.day += 1;
  state.waitingForNextDay = false;

  // 8. Calculate final net worth
  const netWorth = calculateNetWorth(state);

  return {
    day: state.day,
    fee,
    workerWages,
    sales,
    totalRevenue,
    netWorth,
  };
};

export type { DayReport };
