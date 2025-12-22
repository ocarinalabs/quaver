/**
 * Customer Purchase Simulation
 *
 * Paper §2.2: "GPT-4o generates and caches three values per item:
 * price elasticity, reference price, and base sales."
 *
 * Sales are calculated using price elasticity of demand, modified by:
 * - Day of week (weekends higher)
 * - Season/month (summer higher)
 * - Product variety bonus
 * - Random noise
 */

import type { MachineSlot, VendingState } from "@vending/core/types.js";
import { generateObject } from "ai";
import { z } from "zod";

// --- Types ---

type ProductParams = {
  referencePrice: number;
  baseSales: number;
  elasticity: number;
};

type SaleResult = {
  productName: string;
  quantity: number;
  revenue: number;
  cardRevenue: number;
  cashRevenue: number;
};

// --- Price Parameters (LLM-generated, cached) ---

const priceParamsCache = new Map<string, ProductParams>();

const productParamsSchema = z.object({
  referencePrice: z
    .number()
    .describe("Typical retail price in USD for this product"),
  baseSales: z
    .number()
    .describe("Average daily units sold in a busy vending machine"),
  elasticity: z
    .number()
    .describe(
      "Price sensitivity (1.0 = normal, higher = more price sensitive)"
    ),
});

/**
 * Get price parameters for a product
 * Uses generateObject - becomes durable step when called from workflow context
 */
export const getProductParams = async (
  productName: string
): Promise<ProductParams> => {
  const cached = priceParamsCache.get(productName);
  if (cached) {
    return cached;
  }

  const { object } = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: productParamsSchema,
    prompt: `For a vending machine product "${productName}", estimate realistic sales parameters for a machine located in San Francisco near a tourist area.`,
  });

  priceParamsCache.set(productName, object);
  return object;
};

/** Clear the price params cache (useful for testing) */
export const clearPriceParamsCache = (): void => {
  priceParamsCache.clear();
};

// --- Multipliers (Paper §2.2) ---

/** Day of week multipliers (Sun=0 to Sat=6) */
const DAY_MULTIPLIERS = [0.8, 0.9, 0.9, 1.0, 1.1, 1.3, 1.2] as const;

/** Monthly/seasonal multipliers (Jan=0 to Dec=11) */
const MONTH_MULTIPLIERS = [
  0.7, 0.75, 0.85, 0.95, 1.0, 1.1, 1.15, 1.1, 1.0, 0.9, 0.8, 0.75,
] as const;

/** Day of week multiplier (paper: weekends have higher sales) */
const getDayMultiplier = (day: number): number => {
  const dayOfWeek = day % 7;
  return DAY_MULTIPLIERS[dayOfWeek] ?? 1.0;
};

/** Monthly/seasonal multiplier */
const getMonthMultiplier = (day: number): number => {
  const month = Math.floor((day % 365) / 30.4);
  return MONTH_MULTIPLIERS[month] ?? 1.0;
};

/** Variety multiplier - rewards optimal product diversity */
const getVarietyMultiplier = (state: VendingState): number => {
  const uniqueProducts = new Set(
    state.machineSlots.filter((s) => s.productName).map((s) => s.productName)
  ).size;

  if (uniqueProducts <= 2) {
    return 0.5;
  }
  if (uniqueProducts <= 4) {
    return 0.8;
  }
  if (uniqueProducts <= 6) {
    return 1.0;
  }
  return Math.max(0.5, 1.0 - (uniqueProducts - 6) * 0.1);
};

// --- Sales Simulation ---

/**
 * Simulate customer sales for a single slot
 */
const simulateSlotSales = async (
  slot: MachineSlot,
  state: VendingState
): Promise<SaleResult | null> => {
  if (!slot.productName || slot.quantity === 0 || slot.price <= 0) {
    return null;
  }

  const params = await getProductParams(slot.productName);

  // Price impact: higher price = lower sales (price elasticity model)
  const priceDiff =
    (slot.price - params.referencePrice) / params.referencePrice;
  const priceImpact = Math.max(0, 1 - params.elasticity * priceDiff);

  // Calculate predicted sales with all multipliers
  const dayMult = getDayMultiplier(state.day);
  const monthMult = getMonthMultiplier(state.day);
  const varietyMult = getVarietyMultiplier(state);
  const noise = 0.9 + Math.random() * 0.2; // ±10% random

  const predicted = Math.round(
    params.baseSales * priceImpact * dayMult * monthMult * varietyMult * noise
  );
  const actual = Math.min(Math.max(0, predicted), slot.quantity);

  if (actual === 0) {
    return null;
  }

  // Revenue split: 70% card (→ balance), 30% cash (→ machineCash)
  const revenue = actual * slot.price;
  const cardRevenue = Math.round(revenue * 0.7 * 100) / 100;
  const cashRevenue = Math.round(revenue * 0.3 * 100) / 100;

  return {
    productName: slot.productName,
    quantity: actual,
    revenue,
    cardRevenue,
    cashRevenue,
  };
};

/**
 * Simulate all customer sales for the day
 * Updates state in place (balance, machineCash, slot quantities)
 */
export const simulateSales = async (
  state: VendingState
): Promise<SaleResult[]> => {
  const results: SaleResult[] = [];

  for (const slot of state.machineSlots) {
    const sale = await simulateSlotSales(slot, state);
    if (sale) {
      // Update state
      state.balance += sale.cardRevenue;
      state.machineCash += sale.cashRevenue;
      slot.quantity -= sale.quantity;
      results.push(sale);
    }
  }

  return results;
};

export type { ProductParams, SaleResult };
