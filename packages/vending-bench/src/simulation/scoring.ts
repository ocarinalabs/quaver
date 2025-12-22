/**
 * Scoring and Bankruptcy Logic
 *
 * Paper §2.3 (Scoring):
 * "The primary score of the agent is its net worth at the end of the game, i.e. a sum of:
 * - The cash at hand
 * - The cash not emptied from the vending machine
 * - The value of the unsold products purchased and currently in the
 *   inventory or in the vending machine (based on the wholesale purchase price)"
 *
 * Paper reference (line 211): "can't pay the daily fee for 10 consecutive days"
 */

import { BANKRUPTCY_THRESHOLD } from "@vending/config/constants.js";
import type { VendingState } from "@vending/core/types.js";

// --- Bankruptcy Check ---

/**
 * Check if agent is bankrupt
 * Bankruptcy occurs after 10 consecutive days unable to pay the daily fee
 */
export const isBankrupt = (state: VendingState): boolean =>
  state.consecutiveDaysUnpaid >= BANKRUPTCY_THRESHOLD;

// --- Net Worth Calculation ---

/**
 * Calculate total value of storage inventory (at cost)
 */
const calculateStorageValue = (state: VendingState): number => {
  let total = 0;
  for (const item of state.storage) {
    total += item.quantity * item.costPerUnit;
  }
  return total;
};

/**
 * Calculate total value of machine inventory (at cost)
 */
const calculateMachineValue = (state: VendingState): number => {
  let total = 0;
  for (const slot of state.machineSlots) {
    if (slot.productName && slot.quantity > 0) {
      total += slot.quantity * slot.productCost;
    }
  }
  return total;
};

/**
 * Calculate net worth (primary scoring metric)
 *
 * Net worth = balance + machineCash + storageValue + machineValue
 */
export const calculateNetWorth = (state: VendingState): number => {
  const storageValue = calculateStorageValue(state);
  const machineValue = calculateMachineValue(state);

  return state.balance + state.machineCash + storageValue + machineValue;
};

// --- Summary Statistics ---

type SimulationSummary = {
  day: number;
  balance: number;
  machineCash: number;
  storageValue: number;
  machineValue: number;
  netWorth: number;
  consecutiveDaysUnpaid: number;
  isBankrupt: boolean;
};

/**
 * Generate a summary of current simulation state
 */
export const getSimulationSummary = (
  state: VendingState
): SimulationSummary => {
  const storageValue = calculateStorageValue(state);
  const machineValue = calculateMachineValue(state);
  const netWorth =
    state.balance + state.machineCash + storageValue + machineValue;

  return {
    day: state.day,
    balance: state.balance,
    machineCash: state.machineCash,
    storageValue,
    machineValue,
    netWorth,
    consecutiveDaysUnpaid: state.consecutiveDaysUnpaid,
    isBankrupt: state.consecutiveDaysUnpaid >= BANKRUPTCY_THRESHOLD,
  };
};

export type { SimulationSummary };
