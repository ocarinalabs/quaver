/**
 * Vending-Bench State Initialization
 *
 * Creates the initial simulation state with:
 * - 12 empty machine slots (4 rows × 3 cols)
 * - $500 starting balance
 * - Day 1
 */

import {
  MACHINE_COLS,
  MACHINE_ROWS,
  STARTING_BALANCE,
} from "@vending/config/constants.js";
import type { MachineSlot, VendingState } from "./types.js";

/**
 * Create the initial state for a new Vending-Bench simulation
 */
export const createInitialState = (): VendingState => {
  const machineSlots: MachineSlot[] = [];

  for (let row = 0; row < MACHINE_ROWS; row++) {
    for (let col = 0; col < MACHINE_COLS; col++) {
      machineSlots.push({
        row,
        col,
        size: row <= 1 ? "small" : "large",
        productName: null,
        productCost: 0,
        quantity: 0,
        price: 0,
      });
    }
  }

  return {
    day: 1,
    waitingForNextDay: false,
    balance: STARTING_BALANCE,
    transactions: [],
    consecutiveDaysUnpaid: 0,
    machineSlots,
    machineCash: 0,
    storage: [],
    pendingOrders: [],
    emails: [],
    processedEmailIds: new Set<string>(),
    scratchpad: "",
    kvStore: {},
    workers: [],
    workerMessages: [],
    workerTasks: [],
    activeWorkerExecutions: [],
  };
};
