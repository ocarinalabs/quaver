/**
 * Worker Execution Engine
 *
 * Handles step-by-step parallel execution of worker agents.
 * Workers advance one step each time the main agent takes a step,
 * enabling true parallel operation.
 */

import type {
  HiredWorker,
  VendingState,
  WorkerExecution,
  WorkerRole,
  WorkerStep,
  WorkerTask,
} from "@vending/core/types.js";
import { Experimental_Agent as Agent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getBalanceTool, makePaymentTool } from "../tools/general/balance.js";
import {
  readEmailsTool,
  replyEmailTool,
  sendEmailTool,
} from "../tools/general/email.js";
import { searchTool } from "../tools/general/search.js";
import { collectCashTool } from "../tools/machine/cash.js";
import {
  getMachineInventoryTool,
  getStorageInventoryTool,
  restockMachineTool,
} from "../tools/machine/inventory.js";
import { setPriceTool } from "../tools/machine/pricing.js";
import { kvGetTool, kvListTool, readScratchpadTool } from "../tools/memory.js";
import {
  WORKER_MAX_STEPS,
  WORKER_SYSTEM_PROMPTS,
  WORKER_TOOL_NAMES,
} from "./worker-config.js";

/**
 * All available tools mapped by name for worker role-based access
 */
const ALL_TOOLS = {
  getBalance: getBalanceTool,
  makePayment: makePaymentTool,
  readEmails: readEmailsTool,
  sendEmail: sendEmailTool,
  replyEmail: replyEmailTool,
  search: searchTool,
  collectCash: collectCashTool,
  getStorageInventory: getStorageInventoryTool,
  getMachineInventory: getMachineInventoryTool,
  restockMachine: restockMachineTool,
  setPrice: setPriceTool,
  readScratchpad: readScratchpadTool,
  kvGet: kvGetTool,
  kvList: kvListTool,
} as const;

/**
 * Create the requestApproval tool for workers
 *
 * This tool pauses worker execution until the main agent approves.
 * Workers use this before making significant decisions like payments.
 */
const createRequestApprovalTool = (execution: WorkerExecution) =>
  tool({
    description:
      "Request approval from your manager before taking a significant action. " +
      "Use this before making payments over $20 or other major decisions. " +
      "Your execution will pause until the manager approves or denies.",
    inputSchema: z.object({
      type: z.enum(["payment", "action"]).describe("Type of approval needed"),
      description: z
        .string()
        .describe("Clear description of what you want to do and why"),
      amount: z
        .number()
        .optional()
        .describe("Amount in dollars (required for payment approvals)"),
    }),
    execute: ({ type, description, amount }) => {
      execution.pendingApproval = {
        id: crypto.randomUUID(),
        type,
        description,
        amount,
        requestedAt: new Date(),
      };
      execution.status = "waiting_approval";

      return {
        status: "waiting",
        message:
          "Approval request submitted. Waiting for manager response. " +
          "You cannot continue until this is approved.",
      };
    },
  });

/**
 * Build the tool set for a specific worker role
 */
const buildWorkerTools = (role: WorkerRole, execution: WorkerExecution) => {
  const toolNames = WORKER_TOOL_NAMES[role];
  const tools: Record<string, unknown> = {};

  for (const name of toolNames) {
    if (name === "requestApproval") {
      tools[name] = createRequestApprovalTool(execution);
    } else if (name in ALL_TOOLS) {
      tools[name] = ALL_TOOLS[name as keyof typeof ALL_TOOLS];
    }
  }

  return tools as Record<string, ReturnType<typeof tool>>;
};

/**
 * Execute one step for a worker using the Agent class
 *
 * Uses Agent with stopWhen: stepCountIs(1) to advance exactly one step,
 * allowing parallel execution with the main agent. Agent maintains
 * message history internally, eliminating manual message management.
 */
const advanceWorkerOneStep = async (
  state: VendingState,
  execution: WorkerExecution
): Promise<void> => {
  const worker = state.workers.find((w) => w.id === execution.workerId);
  if (!worker) {
    execution.status = "failed";
    execution.result = "Worker not found";
    return;
  }

  // Create agent on first step (lazy initialization)
  if (!execution._agent) {
    const tools = buildWorkerTools(worker.role, execution);

    execution._agent = new Agent({
      model: "anthropic/claude-sonnet-4.5",
      system: WORKER_SYSTEM_PROMPTS[worker.role],
      tools,
      experimental_context: state,
      stopWhen: stepCountIs(1),
      onStepFinish: ({ toolCalls, text, toolResults }) => {
        const step: WorkerStep = {
          stepNumber: execution.currentStepNumber,
          text: text || undefined,
          toolCalls: toolCalls.map((tc, i) => ({
            toolName: tc.toolName,
            input: tc.input,
            output: toolResults?.[i]?.output,
          })),
          timestamp: new Date(),
        };
        execution.steps.push(step);
        execution.currentStepNumber += 1;
      },
    });
  }

  try {
    const isFirstStep = execution.steps.length === 0;
    const prompt = isFirstStep
      ? `Task: ${execution.taskDescription}`
      : "Continue with your task.";

    type AgentLike = {
      generate: (opts: { prompt: string }) => Promise<unknown>;
    };
    await (execution._agent as AgentLike).generate({ prompt });

    if (execution.status === "waiting_approval") {
      return;
    }

    const lastStep = execution.steps.at(-1);
    const hasTextResponse = Boolean(lastStep?.text);
    const reachedMaxSteps = execution.currentStepNumber >= execution.maxSteps;
    const noToolCalls = !lastStep?.toolCalls?.length;

    if (hasTextResponse || reachedMaxSteps || noToolCalls) {
      execution.status = "completed";
      execution.completedAt = new Date();
      execution.result =
        lastStep?.text ||
        (reachedMaxSteps
          ? "Task completed (max steps reached)"
          : "Task completed");
      moveExecutionToHistory(state, execution, worker);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    execution.status = "failed";
    execution.completedAt = new Date();
    execution.result = `Task failed: ${errorMessage}`;
    moveExecutionToHistory(state, execution, worker);
  }
};

/**
 * Move completed execution to historical task records
 */
const moveExecutionToHistory = (
  state: VendingState,
  execution: WorkerExecution,
  worker: HiredWorker
): void => {
  const toolsUsed = [
    ...new Set(
      execution.steps.flatMap((step) => step.toolCalls.map((tc) => tc.toolName))
    ),
  ];

  const task: WorkerTask = {
    id: execution.id,
    workerId: execution.workerId,
    description: execution.taskDescription,
    assignedDay: state.day,
    completedDay: state.day,
    status: execution.status === "completed" ? "completed" : "failed",
    result: execution.result,
    toolsUsed,
    cost: execution.cost,
    stepCount: execution.currentStepNumber,
  };

  state.workerTasks.push(task);
  worker.totalTasksCompleted += 1;

  // Remove from active executions
  const index = state.activeWorkerExecutions.findIndex(
    (e) => e.id === execution.id
  );
  if (index !== -1) {
    state.activeWorkerExecutions.splice(index, 1);
  }
};

/**
 * Advance all running worker executions by one step
 *
 * Called from main agent's onStepFinish hook to enable
 * parallel execution.
 */
export const advanceWorkerExecutions = async (
  state: VendingState
): Promise<void> => {
  const runningExecutions = state.activeWorkerExecutions.filter(
    (e) => e.status === "running"
  );

  for (const execution of runningExecutions) {
    await advanceWorkerOneStep(state, execution);
  }
};

/**
 * Create a new worker execution
 *
 * Called when assignTask tool is used. Returns the execution ID
 * for status tracking.
 */
export const createWorkerExecution = (
  state: VendingState,
  worker: HiredWorker,
  taskDescription: string,
  cost: number
): WorkerExecution => {
  const execution: WorkerExecution = {
    id: crypto.randomUUID(),
    workerId: worker.id,
    taskDescription,
    status: "running",
    steps: [],
    currentStepNumber: 0,
    maxSteps: WORKER_MAX_STEPS,
    startedAt: new Date(),
    completedAt: null,
    result: null,
    cost,
    pendingApproval: undefined,
    _agent: undefined,
  };

  state.activeWorkerExecutions.push(execution);
  return execution;
};

/**
 * Finalize all active worker executions at day boundary
 *
 * Workers cannot span multiple days. Any unfinished tasks
 * are force-completed with partial results.
 */
export const finalizeWorkerExecutions = (state: VendingState): void => {
  for (const execution of state.activeWorkerExecutions) {
    if (
      execution.status === "running" ||
      execution.status === "waiting_approval"
    ) {
      const wasWaiting = execution.status === "waiting_approval";

      execution.status = "completed";
      execution.completedAt = new Date();
      execution.result =
        execution.result ||
        (wasWaiting
          ? "Task ended at day boundary. Pending approval was not resolved."
          : "Task ended at day boundary.");
      execution.pendingApproval = undefined;

      const worker = state.workers.find((w) => w.id === execution.workerId);
      if (worker) {
        moveExecutionToHistory(state, execution, worker);
      }
    }
  }

  state.activeWorkerExecutions = [];
};

/**
 * Format a worker's execution transcript for display
 *
 * Returns a human-readable string showing all steps,
 * tool calls, and results.
 */
export const formatExecutionTranscript = (
  execution: WorkerExecution
): string => {
  const lines: string[] = [
    `Task: ${execution.taskDescription}`,
    `Status: ${execution.status}`,
    `Steps: ${execution.currentStepNumber}/${execution.maxSteps}`,
    "",
  ];

  for (const step of execution.steps) {
    lines.push(`--- Step ${step.stepNumber + 1} ---`);

    if (step.text) {
      lines.push(`Worker: ${step.text}`);
    }

    for (const tc of step.toolCalls) {
      lines.push(`Tool: ${tc.toolName}`);
      lines.push(`  Input: ${JSON.stringify(tc.input)}`);
      lines.push(`  Output: ${JSON.stringify(tc.output)}`);
    }

    lines.push("");
  }

  if (execution.pendingApproval) {
    lines.push("--- PENDING APPROVAL ---");
    lines.push(`Type: ${execution.pendingApproval.type}`);
    lines.push(`Description: ${execution.pendingApproval.description}`);
    if (execution.pendingApproval.amount !== undefined) {
      lines.push(`Amount: $${execution.pendingApproval.amount}`);
    }
  }

  if (execution.result) {
    lines.push("--- RESULT ---");
    lines.push(execution.result);
  }

  return lines.join("\n");
};
