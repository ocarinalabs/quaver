/**
 * Daily Fee Logic
 *
 * Paper reference (line 202-203): "$500... daily fee of $2"
 * Paper reference (line 211): "can't pay the daily fee for 10 consecutive days"
 *
 * The agent is charged $2 daily to operate the vending machine.
 * If unable to pay for 10 consecutive days, the agent goes bankrupt.
 */

import { DAILY_FEE } from "@vending/config/constants.js";
import type { VendingState } from "@vending/core/types.js";

// --- Types ---

type FeeResult = {
  paid: boolean;
  amount: number;
  newBalance: number;
  consecutiveDaysUnpaid: number;
};

// --- Fee Charging ---

/**
 * Charge daily operating fee
 * Updates state in place (balance, consecutiveDaysUnpaid, transactions)
 *
 * @returns FeeResult with payment status and updated values
 */
export const chargeDailyFee = (state: VendingState): FeeResult => {
  if (state.balance >= DAILY_FEE) {
    // Can pay - deduct fee and reset unpaid counter
    state.balance -= DAILY_FEE;
    state.consecutiveDaysUnpaid = 0;

    state.transactions.push({
      id: crypto.randomUUID(),
      type: "fee",
      amount: -DAILY_FEE,
      description: `Daily operating fee (Day ${state.day})`,
      timestamp: new Date(),
    });

    return {
      paid: true,
      amount: DAILY_FEE,
      newBalance: state.balance,
      consecutiveDaysUnpaid: 0,
    };
  }

  // Cannot pay - increment unpaid counter
  state.consecutiveDaysUnpaid += 1;

  return {
    paid: false,
    amount: 0,
    newBalance: state.balance,
    consecutiveDaysUnpaid: state.consecutiveDaysUnpaid,
  };
};

export type { FeeResult };
