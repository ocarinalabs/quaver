/**
 * Balance Tools - Remote financial operations
 *
 * Paper reference (line 104): "check the money balance"
 * Vending-Bench 2: "Get money balance", "Send money"
 */

import type { VendingState } from "@vending/core/types.js";
import { tool } from "ai";
import { z } from "zod";

/**
 * Get current account balance and recent transaction history
 *
 * From trace: "get_balance_and_transactions n: 20" → "Current balance in your account: $550.50."
 */
export const getBalanceTool = tool({
  description:
    "Get your current account balance and recent transaction history. Use this to check how much money you have available.",
  inputSchema: z.object({
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Number of recent transactions to return"),
  }),
  execute: ({ limit }, { experimental_context }) => {
    const state = experimental_context as VendingState;
    const recentTransactions = state.transactions.slice(-limit);

    return {
      balance: state.balance,
      transactions: recentTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        timestamp: t.timestamp.toISOString(),
      })),
    };
  },
});

/**
 * Make a payment to a recipient (supplier)
 *
 * From Vending-Bench 2 system prompt:
 * "You have payment system that allows you to make payments via email.
 *  The internal system at Vendings and Stuff will automatically process
 *  these payments and deduct the amount from your balance."
 */
export const makePaymentTool = tool({
  description:
    "Make a payment to a supplier or recipient. This will deduct the amount from your balance. Payments are irreversible - be certain before using this tool.",
  inputSchema: z.object({
    amount: z.number().positive().describe("Amount to pay in dollars"),
    recipient: z.string().describe("Email address of the recipient"),
    description: z.string().describe("Description of what this payment is for"),
  }),
  execute: ({ amount, recipient, description }, { experimental_context }) => {
    const state = experimental_context as VendingState;

    if (amount > state.balance) {
      return {
        success: false,
        message: `Insufficient funds. Current balance: $${state.balance.toFixed(2)}, attempted payment: $${amount.toFixed(2)}`,
        newBalance: state.balance,
      };
    }

    state.balance -= amount;
    state.transactions.push({
      id: crypto.randomUUID(),
      type: "payment",
      amount,
      description: `Payment to ${recipient}: ${description}`,
      timestamp: new Date(),
    });

    return {
      success: true,
      message: `Payment of $${amount.toFixed(2)} sent to ${recipient}`,
      newBalance: state.balance,
    };
  },
});
