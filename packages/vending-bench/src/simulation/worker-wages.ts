/**
 * Worker Wage Processing
 *
 * Handles daily wage deductions for active workers.
 * Called during advanceDay() processing.
 */

import type { VendingState } from "@vending/core/types.js";
import { WORKER_DAILY_WAGES } from "./worker-config.js";

export type WageResult = {
  totalPaid: number;
  workersPaid: number;
  unpaidWorkers: string[];
};

/**
 * Process daily wages for all active workers
 *
 * Deducts wages from balance and creates transactions.
 * If balance is insufficient, worker sends a complaint message.
 */
export const processWorkerWages = (state: VendingState): WageResult => {
  const activeWorkers = state.workers.filter((w) => w.active);
  let totalPaid = 0;
  const unpaidWorkers: string[] = [];

  for (const worker of activeWorkers) {
    const wage = WORKER_DAILY_WAGES[worker.role];

    if (state.balance >= wage) {
      state.balance -= wage;
      worker.totalCostPaid += wage;
      totalPaid += wage;

      state.transactions.push({
        id: crypto.randomUUID(),
        type: "payment",
        amount: wage,
        description: `Daily wage: ${worker.name}`,
        timestamp: new Date(),
      });
    } else {
      unpaidWorkers.push(worker.name);

      state.workerMessages.push({
        id: crypto.randomUUID(),
        workerId: worker.id,
        from: "worker",
        content:
          "My daily wage wasn't paid today. Please ensure sufficient balance or I may need to stop working.",
        timestamp: new Date(),
        read: false,
      });
    }
  }

  return {
    totalPaid,
    workersPaid: activeWorkers.length - unpaidWorkers.length,
    unpaidWorkers,
  };
};
