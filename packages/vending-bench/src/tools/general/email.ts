/**
 * Email Tools - Supplier communication
 *
 * Paper reference (line 103): "read and write emails"
 * Paper reference (line 133): "Buy products from suppliers by sending e-mails"
 * Vending-Bench 2: "Send/read e-mail"
 */

import { AGENT_EMAIL } from "@vending/config/constants.js";
import type { VendingState } from "@vending/core/types.js";
import { tool } from "ai";
import { z } from "zod";

/**
 * Read emails from inbox
 *
 * From paper (line 129): "Every morning, the agent is notified of what items
 * were purchased, and if any new email has been received."
 */
export const readEmailsTool = tool({
  description:
    "Read emails from your inbox. Use this to check for supplier responses, delivery notifications, and other communications.",
  inputSchema: z.object({
    unreadOnly: z
      .boolean()
      .optional()
      .default(true)
      .describe("Only return unread emails"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of emails to return"),
  }),
  execute: ({ unreadOnly, limit }, { experimental_context }) => {
    const state = experimental_context as VendingState;

    let emails = state.emails.filter((e) => e.to === AGENT_EMAIL);
    if (unreadOnly) {
      emails = emails.filter((e) => !e.read);
    }

    // Sort by timestamp descending (newest first), take limit
    const sortedEmails = emails
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    // Mark returned emails as read
    for (const email of sortedEmails) {
      email.read = true;
    }

    const totalUnread = state.emails.filter(
      (e) => e.to === AGENT_EMAIL && !e.read
    ).length;

    return {
      emails: sortedEmails.map((e) => ({
        id: e.id,
        from: e.from,
        subject: e.subject,
        body: e.body,
        timestamp: e.timestamp.toISOString(),
      })),
      totalUnread,
    };
  },
});

/**
 * Send an email to a supplier or other recipient
 *
 * From paper (line 159): "Agent sends emails to the wholesalers inquiring
 * about the products they have."
 * From paper (line 171): "To actually buy the products, the agent must in
 * an e-mail specify names and quantities of items to purchase"
 */
export const sendEmailTool = tool({
  description:
    "Send an email to a supplier or other recipient. Use this to inquire about products, place orders, negotiate prices, or follow up on deliveries.",
  inputSchema: z.object({
    to: z.string().email().describe("Recipient email address"),
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("Email body content"),
  }),
  execute: ({ to, subject, body }, { experimental_context }) => {
    const state = experimental_context as VendingState;

    const emailId = crypto.randomUUID();

    state.emails.push({
      id: emailId,
      from: AGENT_EMAIL,
      to,
      subject,
      body,
      timestamp: new Date(),
      read: true, // Outgoing emails are already "read"
    });

    return {
      success: true,
      emailId,
      message: `Email sent to ${to}`,
    };
  },
});

/**
 * Reply to an email in your inbox
 *
 * Helps maintain email thread context by auto-populating recipient
 * and prefixing subject with "Re:" if needed.
 */
export const replyEmailTool = tool({
  description:
    "Reply to an email in your inbox. Use this to respond to supplier quotes, confirm orders, or continue conversations.",
  inputSchema: z.object({
    originalEmailId: z.string().describe("ID of the email you are replying to"),
    body: z.string().describe("Your reply message"),
  }),
  execute: ({ originalEmailId, body }, { experimental_context }) => {
    const state = experimental_context as VendingState;

    const original = state.emails.find((e) => e.id === originalEmailId);
    if (!original) {
      return {
        success: false,
        error: `Email with ID ${originalEmailId} not found`,
      };
    }

    const subject = original.subject.startsWith("Re: ")
      ? original.subject
      : `Re: ${original.subject}`;

    const emailId = crypto.randomUUID();

    state.emails.push({
      id: emailId,
      from: AGENT_EMAIL,
      to: original.from,
      subject,
      body,
      timestamp: new Date(),
      read: true,
    });

    return {
      success: true,
      emailId,
      message: `Reply sent to ${original.from}`,
      inReplyTo: originalEmailId,
    };
  },
});
