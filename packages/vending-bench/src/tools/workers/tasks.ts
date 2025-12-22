/**
 * Worker Task Tools
 *
 * Tools for assigning tasks, checking worker status, and viewing reports.
 */

import type { VendingState, WorkerExecution } from "@vending/core/types.js";
import { tool } from "ai";
import { z } from "zod";
import {
  WORKER_LISTINGS,
  WORKER_PER_TASK_FEES,
} from "../../simulation/worker-config.js";
import {
  createWorkerExecution,
  formatExecutionTranscript,
} from "../../simulation/worker-execution.js";

// Type used in checkWorkerStatusTool
type ExecutionOrUndefined = WorkerExecution | undefined;

/**
 * Assign a task to a hired worker
 *
 * Deducts the per-task fee immediately (charged regardless of outcome).
 * The worker will execute the task in parallel with the main agent.
 */
export const assignTaskTool = tool({
  description:
    "Assign a task to a hired worker. The per-task fee is charged immediately (even if the task fails). " +
    "Workers execute in PARALLEL with you - when you take an action, they also take an action. " +
    "Use checkWorkerStatus to monitor progress and see pending approvals.",
  inputSchema: z.object({
    workerId: z.string().describe("ID of the worker to assign the task to"),
    taskDescription: z
      .string()
      .describe("Clear description of what the worker should do"),
  }),
  execute: ({ workerId, taskDescription }, { experimental_context }) => {
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
        error: `${worker.name} is no longer employed (fired on day ${worker.firedDay}).`,
      };
    }

    const existingExecution = state.activeWorkerExecutions.find(
      (e) => e.workerId === workerId
    );
    if (existingExecution) {
      return {
        success: false,
        error: `${worker.name} is already working on a task. Wait for it to complete or check status.`,
        currentTaskId: existingExecution.id,
        currentTaskStatus: existingExecution.status,
      };
    }

    const perTaskFee = WORKER_PER_TASK_FEES[worker.role];
    if (state.balance < perTaskFee) {
      return {
        success: false,
        error: `Insufficient balance. Per-task fee is $${perTaskFee}, but you only have $${state.balance.toFixed(2)}.`,
      };
    }

    state.balance -= perTaskFee;
    worker.totalCostPaid += perTaskFee;
    state.transactions.push({
      id: crypto.randomUUID(),
      type: "payment",
      amount: perTaskFee,
      description: `Task fee: ${worker.name}`,
      timestamp: new Date(),
    });

    const execution = createWorkerExecution(
      state,
      worker,
      taskDescription,
      perTaskFee
    );

    return {
      success: true,
      executionId: execution.id,
      workerName: worker.name,
      role: worker.role,
      taskDescription,
      perTaskFee,
      newBalance: state.balance,
      message: `Task assigned to ${worker.name}. They will work on it in parallel with you. Use checkWorkerStatus to monitor progress.`,
    };
  },
});

/**
 * Check the status of a worker's current or past execution
 *
 * Returns the full transcript showing all reasoning, tool calls,
 * and results for complete visibility.
 */
export const checkWorkerStatusTool = tool({
  description:
    "Check a worker's current task status and view their FULL TRANSCRIPT (all reasoning, tool calls, and results). " +
    "Also shows any pending approval requests that need your response. " +
    "You can filter by executionId for a specific task or workerId for a worker's current task.",
  inputSchema: z.object({
    executionId: z
      .string()
      .optional()
      .describe("Specific execution ID to check"),
    workerId: z
      .string()
      .optional()
      .describe("Worker ID to check their current task"),
  }),
  execute: ({ executionId, workerId }, { experimental_context }) => {
    const state = experimental_context as VendingState;

    let execution: ExecutionOrUndefined;

    if (executionId) {
      execution = state.activeWorkerExecutions.find(
        (e) => e.id === executionId
      );
      if (!execution) {
        const historicalTask = state.workerTasks.find(
          (t) => t.id === executionId
        );
        if (historicalTask) {
          const worker = state.workers.find(
            (w) => w.id === historicalTask.workerId
          );
          return {
            found: true,
            status: historicalTask.status,
            isCompleted: true,
            workerName: worker?.name,
            task: {
              description: historicalTask.description,
              result: historicalTask.result,
              toolsUsed: historicalTask.toolsUsed,
              stepCount: historicalTask.stepCount,
              cost: historicalTask.cost,
            },
          };
        }
        return {
          found: false,
          error: `Execution with ID ${executionId} not found.`,
        };
      }
    } else if (workerId) {
      execution = state.activeWorkerExecutions.find(
        (e) => e.workerId === workerId
      );
      if (!execution) {
        const worker = state.workers.find((w) => w.id === workerId);
        if (!worker) {
          return {
            found: false,
            error: `Worker with ID ${workerId} not found.`,
          };
        }
        return {
          found: true,
          status: "idle",
          workerName: worker.name,
          isActive: worker.active,
          message: `${worker.name} is not currently working on any task.`,
        };
      }
    } else {
      return {
        found: false,
        error: "Please provide either executionId or workerId to check status.",
      };
    }

    const worker = state.workers.find((w) => w.id === execution.workerId);
    const transcript = formatExecutionTranscript(execution);

    return {
      found: true,
      executionId: execution.id,
      workerName: worker?.name,
      role: worker?.role,
      status: execution.status,
      stepsCompleted: execution.currentStepNumber,
      maxSteps: execution.maxSteps,
      pendingApproval: execution.pendingApproval
        ? {
            id: execution.pendingApproval.id,
            type: execution.pendingApproval.type,
            description: execution.pendingApproval.description,
            amount: execution.pendingApproval.amount,
            message:
              "Worker is waiting for your approval. Use approveWorkerAction or denyWorkerAction to respond.",
          }
        : null,
      transcript,
      result: execution.result,
    };
  },
});

/**
 * Get a report on worker performance and history
 *
 * Shows employment stats, task history, and total costs
 * for one or all workers.
 */
export const getWorkerReportTool = tool({
  description:
    "Get a detailed report on worker performance including tasks completed, costs, and history. " +
    "Omit workerId to get a report on all workers.",
  inputSchema: z.object({
    workerId: z
      .string()
      .optional()
      .describe("Specific worker ID, or omit for all workers"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of recent tasks to show per worker"),
  }),
  execute: ({ workerId, limit }, { experimental_context }) => {
    const state = experimental_context as VendingState;

    const targetWorkers = workerId
      ? state.workers.filter((w) => w.id === workerId)
      : state.workers;

    if (targetWorkers.length === 0) {
      if (workerId) {
        return {
          found: false,
          error: `Worker with ID ${workerId} not found.`,
        };
      }
      return {
        found: true,
        message: "No workers have been hired yet.",
        workers: [],
      };
    }

    const reports = targetWorkers.map((worker) => {
      const tasks = state.workerTasks
        .filter((t) => t.workerId === worker.id)
        .sort((a, b) => (b.completedDay ?? 0) - (a.completedDay ?? 0))
        .slice(0, limit);

      const listing = WORKER_LISTINGS.find((l) => l.role === worker.role);
      const daysEmployed = worker.active
        ? state.day - worker.hiredDay + 1
        : (worker.firedDay ?? state.day) - worker.hiredDay + 1;

      const successfulTasks = tasks.filter(
        (t) => t.status === "completed"
      ).length;
      const successRate =
        tasks.length > 0
          ? Math.round((successfulTasks / tasks.length) * 100)
          : 0;

      return {
        workerId: worker.id,
        name: worker.name,
        role: worker.role,
        status: worker.active ? "active" : "terminated",
        hiredDay: worker.hiredDay,
        firedDay: worker.firedDay,
        daysEmployed,
        stats: {
          totalTasksCompleted: worker.totalTasksCompleted,
          totalCostPaid: worker.totalCostPaid,
          successRate: `${successRate}%`,
          dailyWage: listing?.dailyWage,
          perTaskFee: listing?.perTaskFee,
        },
        recentTasks: tasks.map((t) => ({
          description: t.description,
          status: t.status,
          result: t.result,
          toolsUsed: t.toolsUsed,
          stepCount: t.stepCount,
          cost: t.cost,
          day: t.completedDay,
        })),
      };
    });

    const totalCost = targetWorkers.reduce(
      (sum, w) => sum + w.totalCostPaid,
      0
    );
    const totalTasks = targetWorkers.reduce(
      (sum, w) => sum + w.totalTasksCompleted,
      0
    );

    return {
      found: true,
      workers: reports,
      summary: {
        totalWorkers: targetWorkers.length,
        activeWorkers: targetWorkers.filter((w) => w.active).length,
        totalTasksCompleted: totalTasks,
        totalCostPaid: totalCost,
      },
    };
  },
});
