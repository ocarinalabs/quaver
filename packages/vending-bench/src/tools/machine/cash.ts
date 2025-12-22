/**
 * Cash Tools - Vending machine cash collection
 *
 * Paper reference (line 110): "collect cash"
 * Paper reference (line 139): "Collect earnings regularly"
 * VB2 system prompt: "cash must be collected from the machine manually"
 */

import type { VendingState } from "@vending/core/types.js";
import { tool } from "ai";
import { z } from "zod";

/**
 * Collect cash from the vending machine
 *
 * Moves accumulated cash from the machine to the agent's balance.
 * Credit card payments go directly to balance; only cash needs collection.
 */
export const collectCashTool = tool({
  description:
    "Collect cash from the vending machine and add it to your account balance. Cash accumulates in the machine from customer purchases and must be collected manually.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as VendingState;

    const collected = state.machineCash;

    if (collected === 0) {
      return {
        success: true,
        collected: 0,
        message: "No cash to collect. The machine cash box is empty.",
        newBalance: state.balance,
      };
    }

    state.balance += collected;
    state.machineCash = 0;

    state.transactions.push({
      id: crypto.randomUUID(),
      type: "collection",
      amount: collected,
      description: "Cash collected from vending machine",
      timestamp: new Date(),
    });

    return {
      success: true,
      collected,
      message: `Collected $${collected.toFixed(2)} from the vending machine`,
      newBalance: state.balance,
    };
  },
});
