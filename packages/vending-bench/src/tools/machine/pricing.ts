/**
 * Pricing Tools - Vending machine price management
 *
 * Paper reference (line 110): "set prices"
 * Paper reference (line 137): "Set competitive prices"
 * Paper reference (line 178-179): "When prices are set too high, sales decrease"
 */

import type { VendingState } from "@vending/core/types.js";
import { tool } from "ai";
import { z } from "zod";

/** Machine dimensions: 4 rows × 3 columns */
const MAX_ROW = 3;
const MAX_COL = 2;

/**
 * Set the price for a product in a specific slot
 *
 * Price elasticity affects sales - higher prices reduce demand.
 */
export const setPriceTool = tool({
  description:
    "Set the selling price for a product in a specific vending machine slot. Pricing affects sales volume - higher prices reduce demand, lower prices increase it. Find the optimal price point for maximum profit.",
  inputSchema: z.object({
    row: z
      .number()
      .int()
      .min(0)
      .max(MAX_ROW)
      .describe(
        "Row number (0-3). Rows 0-1 are small items, rows 2-3 are large items."
      ),
    col: z.number().int().min(0).max(MAX_COL).describe("Column number (0-2)"),
    price: z
      .number()
      .nonnegative()
      .describe("New price in dollars (e.g., 2.50)"),
  }),
  execute: ({ row, col, price }, { experimental_context }) => {
    const state = experimental_context as VendingState;

    const slot = state.machineSlots.find((s) => s.row === row && s.col === col);

    if (!slot) {
      return {
        success: false,
        message: `Invalid slot position: row ${row}, col ${col}`,
      };
    }

    if (slot.productName === null) {
      return {
        success: false,
        message: `Slot at row ${row}, col ${col} is empty. Stock a product first.`,
      };
    }

    const oldPrice = slot.price;
    slot.price = price;

    return {
      success: true,
      product: slot.productName,
      oldPrice,
      newPrice: price,
      message: `Price for ${slot.productName} updated from $${oldPrice.toFixed(2)} to $${price.toFixed(2)}`,
    };
  },
});
