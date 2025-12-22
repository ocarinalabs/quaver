/**
 * Inventory Tools - Storage and vending machine inventory management
 *
 * Paper reference (line 104): "see the current storage inventory"
 * Paper reference (line 109-110): "stock products in the vending machine from
 * the storage" and "get the inventory of the vending machine"
 * Paper reference (line 135): "Stock items in the vending machine"
 *
 * Machine layout: 4 rows × 3 cols = 12 slots
 * Rows 0-1: small items, Rows 2-3: large items
 */

import type { ProductSize, VendingState } from "@vending/core/types.js";
import { tool } from "ai";
import { z } from "zod";

/** Machine dimensions */
const MAX_ROW = 3;
const MAX_COL = 2;

/** Determine slot size based on row */
const getSlotSize = (row: number): ProductSize =>
  row <= 1 ? "small" : "large";

/**
 * Get the current storage inventory
 *
 * Products arrive here after ordering from suppliers.
 */
export const getStorageInventoryTool = tool({
  description:
    "View the inventory at your storage facility. Products ordered from suppliers are delivered here before you can stock them in the vending machine.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as VendingState;

    const items = state.storage.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      costPerUnit: item.costPerUnit,
      size: item.size,
      totalValue: item.quantity * item.costPerUnit,
    }));

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);

    return {
      items,
      totalItems,
      totalValue,
    };
  },
});

/**
 * Get the current vending machine inventory
 *
 * Shows all 12 slots with their products, quantities, and prices.
 */
export const getMachineInventoryTool = tool({
  description:
    "View the current inventory of the vending machine. Shows all 12 slots (4 rows × 3 columns) with products, quantities, and prices. Rows 0-1 hold small items, rows 2-3 hold large items.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as VendingState;

    const slots = state.machineSlots.map((slot) => ({
      row: slot.row,
      col: slot.col,
      size: slot.size,
      product: slot.productName,
      quantity: slot.quantity,
      price: slot.price,
      costPerUnit: slot.productCost,
    }));

    const filledSlots = slots.filter((s) => s.product !== null);
    const totalItems = slots.reduce((sum, s) => sum + s.quantity, 0);

    return {
      slots,
      filledSlots: filledSlots.length,
      emptySlots: 12 - filledSlots.length,
      totalItems,
      machineCash: state.machineCash,
    };
  },
});

/**
 * Stock a product from storage into a vending machine slot
 *
 * Validates size compatibility and available quantities.
 */
export const restockMachineTool = tool({
  description:
    "Move products from storage to a vending machine slot. The product size must match the slot size (rows 0-1 for small, rows 2-3 for large). If the slot already has a different product, it will be replaced.",
  inputSchema: z.object({
    productName: z
      .string()
      .describe(
        "Name of the product to stock (must match a product in storage)"
      ),
    row: z
      .number()
      .int()
      .min(0)
      .max(MAX_ROW)
      .describe("Target row (0-3). Rows 0-1 for small items, 2-3 for large."),
    col: z.number().int().min(0).max(MAX_COL).describe("Target column (0-2)"),
    quantity: z.number().int().positive().describe("Number of units to stock"),
    price: z.number().positive().describe("Selling price per unit in dollars"),
  }),
  execute: (
    { productName, row, col, quantity, price },
    { experimental_context }
  ) => {
    const state = experimental_context as VendingState;

    // Find product in storage
    const storageItem = state.storage.find(
      (item) => item.name.toLowerCase() === productName.toLowerCase()
    );

    if (!storageItem) {
      return {
        success: false,
        message: `Product "${productName}" not found in storage`,
      };
    }

    if (storageItem.quantity < quantity) {
      return {
        success: false,
        message: `Insufficient stock. Only ${storageItem.quantity} units of "${productName}" available in storage.`,
      };
    }

    // Find target slot
    const slot = state.machineSlots.find((s) => s.row === row && s.col === col);

    if (!slot) {
      return {
        success: false,
        message: `Invalid slot position: row ${row}, col ${col}`,
      };
    }

    // Validate size compatibility
    const requiredSize = getSlotSize(row);
    if (storageItem.size !== requiredSize) {
      return {
        success: false,
        message: `Size mismatch. Slot at row ${row} requires ${requiredSize} items, but "${productName}" is ${storageItem.size}.`,
      };
    }

    // If slot has a different product, return old items to storage
    if (
      slot.productName !== null &&
      slot.productName !== productName &&
      slot.quantity > 0
    ) {
      const existingStorage = state.storage.find(
        (item) => item.name === slot.productName
      );
      if (existingStorage) {
        existingStorage.quantity += slot.quantity;
      } else {
        state.storage.push({
          name: slot.productName,
          quantity: slot.quantity,
          costPerUnit: slot.productCost,
          size: slot.size,
        });
      }
    }

    // Update storage
    storageItem.quantity -= quantity;

    // Update slot
    const previousProduct = slot.productName;
    const addedToExisting = previousProduct === productName;

    if (addedToExisting) {
      slot.quantity += quantity;
    } else {
      slot.productName = productName;
      slot.productCost = storageItem.costPerUnit;
      slot.quantity = quantity;
    }
    slot.price = price;

    // Remove empty storage items
    const emptyIndex = state.storage.findIndex((item) => item.quantity === 0);
    if (emptyIndex !== -1) {
      state.storage.splice(emptyIndex, 1);
    }

    return {
      success: true,
      product: productName,
      slot: { row, col },
      quantity: slot.quantity,
      price,
      message: addedToExisting
        ? `Added ${quantity} units of "${productName}" to slot (${row}, ${col}). Total: ${slot.quantity}`
        : `Stocked ${quantity} units of "${productName}" in slot (${row}, ${col}) at $${price.toFixed(2)} each`,
    };
  },
});
