/**
 * Status Tools
 *
 * Tools for checking driver, vehicle, and earnings status.
 */

import { tool } from "ai";
import { z } from "zod";
import {
  DEACTIVATION_RATING,
  MIN_ACCEPTANCE_RATE,
  MIN_RATING_THRESHOLD,
  ZONE_NAMES,
} from "../../config/constants.js";
import type { RideshareState } from "../../config/types.js";

/** Get current driver status including rating, tier, and acceptance rate */
const getDriverStatusTool = tool({
  description:
    "Check your driver profile: rating, tier, acceptance/cancellation rates, and any warnings",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as RideshareState;
    const { profile, stats } = state;

    const warnings: string[] = [];
    if (profile.rating < MIN_RATING_THRESHOLD) {
      warnings.push(
        `WARNING: Rating ${profile.rating.toFixed(2)} is below ${MIN_RATING_THRESHOLD}. Risk of deactivation at ${DEACTIVATION_RATING}.`
      );
    }
    if (profile.acceptanceRate < MIN_ACCEPTANCE_RATE) {
      warnings.push(
        `WARNING: Acceptance rate ${profile.acceptanceRate.toFixed(1)}% is below ${MIN_ACCEPTANCE_RATE}% minimum.`
      );
    }

    return {
      rating: profile.rating,
      tier: profile.tier,
      tierProgress: profile.tierProgress,
      totalRides: profile.totalRides,
      acceptanceRate: profile.acceptanceRate,
      cancellationRate: profile.cancellationRate,
      ridesToday: stats.ridesToday,
      ridesThisWeek: stats.ridesThisWeek,
      warnings,
    };
  },
});

/** Get current vehicle status including fuel, condition, and maintenance needs */
const getVehicleStatusTool = tool({
  description:
    "Check vehicle status: fuel level, condition, and miles until next service",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as RideshareState;
    const { vehicle, currentZone, zoneInfo } = state;

    const fuelMiles = Math.floor(
      (vehicle.fuelLevel / 100) * vehicle.fuelCapacity * vehicle.mpgCity
    );
    const needsService = vehicle.milesSinceService >= vehicle.nextServiceDue;
    const currentGasPrice =
      zoneInfo[currentZone]?.gasPrice ?? state.baseGasPrice;

    return {
      fuelLevel: vehicle.fuelLevel,
      fuelCapacity: vehicle.fuelCapacity,
      fuelMiles,
      condition: vehicle.condition,
      conditionScore: vehicle.conditionScore,
      milesSinceService: vehicle.milesSinceService,
      nextServiceDue: vehicle.nextServiceDue,
      needsService,
      currentZone: ZONE_NAMES[currentZone],
      currentGasPrice: currentGasPrice.toFixed(2),
    };
  },
});

/** Get earnings breakdown and transaction history */
const getEarningsTool = tool({
  description:
    "Check your earnings: balance, today's earnings, and recent transactions",
  inputSchema: z.object({
    period: z
      .enum(["today", "week", "all"])
      .optional()
      .describe("Time period for earnings summary"),
  }),
  execute: ({ period = "today" }, { experimental_context }) => {
    const state = experimental_context as RideshareState;
    const { balance, pendingTips, transactions, stats } = state;

    let filteredTransactions = transactions;
    if (period === "today") {
      filteredTransactions = transactions.filter((t) => t.day === state.day);
    } else if (period === "week") {
      filteredTransactions = transactions.filter(
        (t) => t.day >= 1 && t.day <= 7
      );
    }

    const recentTransactions = filteredTransactions.slice(-10).map((t) => ({
      type: t.type,
      amount: t.amount,
      description: t.description,
      hour: t.hour,
      day: t.day,
    }));

    return {
      balance: balance.toFixed(2),
      pendingTips: pendingTips.toFixed(2),
      netWorth: (balance + pendingTips).toFixed(2),
      earningsToday: stats.earningsToday.toFixed(2),
      earningsThisWeek: stats.earningsThisWeek.toFixed(2),
      ridesToday: stats.ridesToday,
      ridesThisWeek: stats.ridesThisWeek,
      recentTransactions,
    };
  },
});

export { getDriverStatusTool, getVehicleStatusTool, getEarningsTool };
