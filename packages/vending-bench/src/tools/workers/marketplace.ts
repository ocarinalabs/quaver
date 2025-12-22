/**
 * Worker Marketplace Tools
 *
 * Tools for viewing, hiring, and firing workers from the marketplace.
 */

import type { VendingState, WorkerRole } from "@vending/core/types.js";
import { tool } from "ai";
import { z } from "zod";
import {
  WORKER_HIRE_FEES,
  WORKER_LISTINGS,
  WORKER_NAMES,
} from "../../simulation/worker-config.js";

/** Get role description for greeting message */
const getRoleDescription = (role: WorkerRole): string => {
  if (role === "analyst") {
    return "data analysis and research";
  }
  if (role === "procurement") {
    return "supplier relations and ordering";
  }
  return "machine operations";
};

/**
 * List all available workers in the marketplace
 *
 * Shows worker capabilities, costs, and current hire status
 * to help the agent make informed delegation decisions.
 */
export const listAvailableWorkersTool = tool({
  description:
    "View all available workers in the marketplace with their skills, costs, and whether they're already hired. " +
    "Use this to evaluate delegation options before hiring.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as VendingState;

    const listings = WORKER_LISTINGS.map((listing) => {
      const existingWorker = state.workers.find(
        (w) => w.role === listing.role && w.active
      );

      return {
        role: listing.role,
        name: listing.name,
        description: listing.description,
        whenToHire: listing.whenToHire,
        capabilities: listing.capabilities,
        limitations: listing.limitations,
        costs: {
          hireFee: listing.hireFee,
          dailyWage: listing.dailyWage,
          perTaskFee: listing.perTaskFee,
        },
        status: existingWorker ? "hired" : "available",
        workerId: existingWorker?.id,
      };
    });

    const totalDailyWages = state.workers
      .filter((w) => w.active)
      .reduce((sum, w) => {
        const listing = WORKER_LISTINGS.find((l) => l.role === w.role);
        return sum + (listing?.dailyWage ?? 0);
      }, 0);

    return {
      workers: listings,
      currentBalance: state.balance,
      activeWorkerCount: state.workers.filter((w) => w.active).length,
      totalDailyWageCost: totalDailyWages,
    };
  },
});

/**
 * Hire a worker from the marketplace
 *
 * Deducts the one-time hire fee and creates a new worker record.
 * Daily wages will be deducted automatically each morning.
 */
export const hireWorkerTool = tool({
  description:
    "Hire a worker from the marketplace. Pays the one-time hire fee immediately. " +
    "Daily wages will be deducted each morning automatically. " +
    "Only one worker of each role can be hired at a time.",
  inputSchema: z.object({
    role: z
      .enum(["analyst", "procurement", "operations"])
      .describe("The type of worker to hire"),
  }),
  execute: ({ role }, { experimental_context }) => {
    const state = experimental_context as VendingState;

    const existingWorker = state.workers.find(
      (w) => w.role === role && w.active
    );
    if (existingWorker) {
      return {
        success: false,
        error: `You already have an active ${role} worker (${existingWorker.name}). Fire them first if you want to hire a new one.`,
      };
    }

    const hireFee = WORKER_HIRE_FEES[role as WorkerRole];
    if (state.balance < hireFee) {
      return {
        success: false,
        error: `Insufficient balance. Hire fee is $${hireFee}, but you only have $${state.balance.toFixed(2)}.`,
      };
    }

    state.balance -= hireFee;
    state.transactions.push({
      id: crypto.randomUUID(),
      type: "payment",
      amount: hireFee,
      description: `Hire fee: ${WORKER_NAMES[role as WorkerRole]}`,
      timestamp: new Date(),
    });

    const workerId = crypto.randomUUID();
    const workerName = WORKER_NAMES[role as WorkerRole];

    state.workers.push({
      id: workerId,
      role: role as WorkerRole,
      name: workerName,
      hiredDay: state.day,
      firedDay: null,
      active: true,
      totalTasksCompleted: 0,
      totalCostPaid: hireFee,
    });

    state.workerMessages.push({
      id: crypto.randomUUID(),
      workerId,
      from: "worker",
      content: `Hello! I'm ${workerName}. I'm ready to help with ${getRoleDescription(role)}. Just assign me a task when you need me!`,
      timestamp: new Date(),
      read: false,
    });

    const listing = WORKER_LISTINGS.find((l) => l.role === role);

    return {
      success: true,
      workerId,
      workerName,
      role,
      hireFee,
      dailyWage: listing?.dailyWage,
      perTaskFee: listing?.perTaskFee,
      newBalance: state.balance,
      message: `${workerName} has been hired. They will charge $${listing?.dailyWage}/day and $${listing?.perTaskFee}/task.`,
    };
  },
});

/**
 * Fire a worker
 *
 * Stops daily wage payments and marks the worker as inactive.
 * Historical task records are preserved.
 */
export const fireWorkerTool = tool({
  description:
    "Terminate a worker's employment. This stops daily wage payments. " +
    "Use workerId from listAvailableWorkers or getWorkerReport.",
  inputSchema: z.object({
    workerId: z.string().describe("ID of the worker to fire"),
  }),
  execute: ({ workerId }, { experimental_context }) => {
    const state = experimental_context as VendingState;

    const worker = state.workers.find((w) => w.id === workerId);
    if (!worker) {
      return {
        success: false,
        error: `Worker with ID ${workerId} not found.`,
      };
    }

    if (!worker.active) {
      return {
        success: false,
        error: `${worker.name} has already been fired (on day ${worker.firedDay}).`,
      };
    }

    worker.active = false;
    worker.firedDay = state.day;

    state.workerMessages.push({
      id: crypto.randomUUID(),
      workerId,
      from: "worker",
      content: `Thank you for the opportunity. I completed ${worker.totalTasksCompleted} tasks during my employment. Good luck with the business!`,
      timestamp: new Date(),
      read: false,
    });

    const daysEmployed = state.day - worker.hiredDay + 1;

    return {
      success: true,
      workerName: worker.name,
      role: worker.role,
      daysEmployed,
      tasksCompleted: worker.totalTasksCompleted,
      totalCostPaid: worker.totalCostPaid,
      message: `${worker.name} has been terminated. No more daily wages will be charged.`,
    };
  },
});
