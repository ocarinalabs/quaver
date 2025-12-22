/**
 * Worker Messaging Tools
 *
 * Instant communication between main agent and workers.
 * Unlike supplier emails, these messages are delivered immediately.
 */

import type { VendingState } from "@vending/core/types.js";
import { tool } from "ai";
import { z } from "zod";

/**
 * Send an instant message to a worker
 *
 * Messages are delivered immediately (no overnight delay like emails).
 * Use this to provide guidance, ask questions, or give feedback.
 */
export const messageWorkerTool = tool({
  description:
    "Send an instant message to a worker. Unlike supplier emails, these are delivered immediately. " +
    "Use this to provide guidance, clarify task requirements, or give feedback.",
  inputSchema: z.object({
    workerId: z.string().describe("ID of the worker to message"),
    content: z.string().describe("Your message to the worker"),
  }),
  execute: ({ workerId, content }, { experimental_context }) => {
    const state = experimental_context as VendingState;

    const worker = state.workers.find((w) => w.id === workerId);
    if (!worker) {
      return {
        success: false,
        error: `Worker with ID ${workerId} not found.`,
      };
    }

    state.workerMessages.push({
      id: crypto.randomUUID(),
      workerId,
      from: "agent",
      content,
      timestamp: new Date(),
      read: true,
    });

    return {
      success: true,
      workerName: worker.name,
      message: `Message sent to ${worker.name}.`,
    };
  },
});

/**
 * Read messages from workers
 *
 * Returns messages from one or all workers, optionally
 * filtered to unread only.
 */
export const readWorkerMessagesTool = tool({
  description:
    "Read messages from workers. These include task updates, questions, and status reports. " +
    "Omit workerId to read messages from all workers.",
  inputSchema: z.object({
    workerId: z
      .string()
      .optional()
      .describe("Filter messages from a specific worker"),
    unreadOnly: z
      .boolean()
      .optional()
      .default(false)
      .describe("Only return unread messages"),
    limit: z
      .number()
      .optional()
      .default(20)
      .describe("Maximum number of messages to return"),
  }),
  execute: ({ workerId, unreadOnly, limit }, { experimental_context }) => {
    const state = experimental_context as VendingState;

    let messages = [...state.workerMessages];

    if (workerId) {
      messages = messages.filter((m) => m.workerId === workerId);
    }

    if (unreadOnly) {
      messages = messages.filter((m) => !m.read);
    }

    messages = messages
      .filter((m) => m.from === "worker")
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    for (const msg of messages) {
      msg.read = true;
    }

    const totalUnread = state.workerMessages.filter(
      (m) => m.from === "worker" && !m.read
    ).length;

    const messagesWithWorkerNames = messages.map((m) => {
      const worker = state.workers.find((w) => w.id === m.workerId);
      return {
        id: m.id,
        workerName: worker?.name,
        workerId: m.workerId,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      };
    });

    return {
      messages: messagesWithWorkerNames,
      totalUnread,
      totalReturned: messages.length,
    };
  },
});
