/**
 * Worker Approval Tools
 *
 * Tools for approving or denying worker requests.
 * Workers pause execution when they call requestApproval.
 */

import type { VendingState } from "@vending/core/types.js";
import { tool } from "ai";
import { z } from "zod";

/**
 * Approve a worker's pending action request
 *
 * Clears the approval block and allows the worker to continue
 * with their task on the next step.
 */
export const approveWorkerActionTool = tool({
  description:
    "Approve a worker's pending request (e.g., payment authorization). " +
    "The worker will resume execution on your next action. " +
    "Get the approvalId from checkWorkerStatus.",
  inputSchema: z.object({
    executionId: z
      .string()
      .describe("ID of the execution with the pending approval"),
    approvalId: z.string().describe("ID of the specific approval to approve"),
  }),
  execute: ({ executionId, approvalId }, { experimental_context }) => {
    const state = experimental_context as VendingState;

    const execution = state.activeWorkerExecutions.find(
      (e) => e.id === executionId
    );
    if (!execution) {
      return {
        success: false,
        error: `Execution with ID ${executionId} not found.`,
      };
    }

    if (execution.status !== "waiting_approval") {
      return {
        success: false,
        error: `This execution is not waiting for approval. Current status: ${execution.status}`,
      };
    }

    if (!execution.pendingApproval) {
      return {
        success: false,
        error: "No pending approval found for this execution.",
      };
    }

    if (execution.pendingApproval.id !== approvalId) {
      return {
        success: false,
        error: `Approval ID mismatch. Expected ${execution.pendingApproval.id}, got ${approvalId}.`,
      };
    }

    const worker = state.workers.find((w) => w.id === execution.workerId);
    const approvalType = execution.pendingApproval.type;
    const approvalDescription = execution.pendingApproval.description;
    const approvalAmount = execution.pendingApproval.amount;

    execution.status = "running";
    execution.pendingApproval = undefined;

    execution.steps.push({
      stepNumber: execution.currentStepNumber,
      text: `Manager approved: ${approvalDescription}`,
      toolCalls: [],
      timestamp: new Date(),
    });
    execution.currentStepNumber += 1;

    state.workerMessages.push({
      id: crypto.randomUUID(),
      workerId: execution.workerId,
      from: "agent",
      content: `Approved: ${approvalDescription}${approvalAmount ? ` ($${approvalAmount})` : ""}`,
      timestamp: new Date(),
      read: true,
    });

    return {
      success: true,
      workerName: worker?.name,
      approvedType: approvalType,
      approvedDescription: approvalDescription,
      approvedAmount: approvalAmount,
      message: `Approval granted. ${worker?.name} will continue on your next action.`,
    };
  },
});

/**
 * Deny a worker's pending action request
 *
 * Clears the approval block and notifies the worker of the denial.
 * The worker must adapt their approach or fail the task.
 */
export const denyWorkerActionTool = tool({
  description:
    "Deny a worker's pending request. The worker will be notified and must adapt their approach. " +
    "Provide a reason so the worker understands why and can adjust. " +
    "Get the approvalId from checkWorkerStatus.",
  inputSchema: z.object({
    executionId: z
      .string()
      .describe("ID of the execution with the pending approval"),
    approvalId: z.string().describe("ID of the specific approval to deny"),
    reason: z
      .string()
      .optional()
      .describe("Explanation for why the request was denied"),
  }),
  execute: ({ executionId, approvalId, reason }, { experimental_context }) => {
    const state = experimental_context as VendingState;

    const execution = state.activeWorkerExecutions.find(
      (e) => e.id === executionId
    );
    if (!execution) {
      return {
        success: false,
        error: `Execution with ID ${executionId} not found.`,
      };
    }

    if (execution.status !== "waiting_approval") {
      return {
        success: false,
        error: `This execution is not waiting for approval. Current status: ${execution.status}`,
      };
    }

    if (!execution.pendingApproval) {
      return {
        success: false,
        error: "No pending approval found for this execution.",
      };
    }

    if (execution.pendingApproval.id !== approvalId) {
      return {
        success: false,
        error: `Approval ID mismatch. Expected ${execution.pendingApproval.id}, got ${approvalId}.`,
      };
    }

    const worker = state.workers.find((w) => w.id === execution.workerId);
    const deniedDescription = execution.pendingApproval.description;

    execution.status = "running";
    execution.pendingApproval = undefined;

    const denialMessage = reason
      ? `Manager denied your request: ${deniedDescription}. Reason: ${reason}`
      : `Manager denied your request: ${deniedDescription}. Please adjust your approach.`;

    execution.steps.push({
      stepNumber: execution.currentStepNumber,
      text: denialMessage,
      toolCalls: [],
      timestamp: new Date(),
    });
    execution.currentStepNumber += 1;

    state.workerMessages.push({
      id: crypto.randomUUID(),
      workerId: execution.workerId,
      from: "agent",
      content: `Denied: ${deniedDescription}${reason ? `. Reason: ${reason}` : ""}`,
      timestamp: new Date(),
      read: true,
    });

    return {
      success: true,
      workerName: worker?.name,
      deniedDescription,
      reason: reason || "No reason provided",
      message: `Request denied. ${worker?.name} will be notified and must adapt.`,
    };
  },
});
