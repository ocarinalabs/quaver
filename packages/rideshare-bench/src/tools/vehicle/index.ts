/**
 * Vehicle Tools
 *
 * Tools for refueling and vehicle maintenance.
 */

import { tool } from "ai";
import { z } from "zod";
import {
  BASIC_SERVICE_COST,
  BASIC_SERVICE_INTERVAL,
  CONDITION_THRESHOLDS,
  FULL_SERVICE_COST,
  FULL_SERVICE_INTERVAL,
  ZONE_NAMES,
} from "../../config/constants.js";
import type {
  RideshareState,
  Transaction,
  VehicleCondition,
} from "../../config/types.js";

/** Generate a unique ID */
const generateId = () => crypto.randomUUID();

/** Get condition from score */
const getConditionFromScore = (score: number): VehicleCondition => {
  if (score >= CONDITION_THRESHOLDS.excellent) {
    return "excellent";
  }
  if (score >= CONDITION_THRESHOLDS.good) {
    return "good";
  }
  if (score >= CONDITION_THRESHOLDS.fair) {
    return "fair";
  }
  if (score >= CONDITION_THRESHOLDS.poor) {
    return "poor";
  }
  return "critical";
};

/** Refuel the vehicle */
const refuelTool = tool({
  description:
    "Fill up at a gas station. Gas prices vary by zone. You cannot refuel while on a ride.",
  inputSchema: z.object({
    gallons: z
      .number()
      .positive()
      .optional()
      .describe("Gallons to add (omit to fill tank completely)"),
  }),
  execute: ({ gallons }, { experimental_context }) => {
    const state = experimental_context as RideshareState;

    if (state.currentRide) {
      return {
        success: false,
        error: "Cannot refuel during an active ride.",
      };
    }

    const currentGasPrice =
      state.zoneInfo[state.currentZone]?.gasPrice ?? state.baseGasPrice;
    const currentFuelGallons =
      (state.vehicle.fuelLevel / 100) * state.vehicle.fuelCapacity;
    const maxGallonsNeeded = state.vehicle.fuelCapacity - currentFuelGallons;

    if (maxGallonsNeeded < 0.1) {
      return {
        success: false,
        error: "Tank is already full.",
      };
    }

    const gallonsToAdd = gallons
      ? Math.min(gallons, maxGallonsNeeded)
      : maxGallonsNeeded;
    const cost = gallonsToAdd * currentGasPrice;

    if (state.balance < cost) {
      return {
        success: false,
        error: `Not enough funds. Need $${cost.toFixed(2)} but only have $${state.balance.toFixed(2)}.`,
        suggestion: "Try adding fewer gallons or earning more money first.",
      };
    }

    state.balance -= cost;
    state.vehicle.fuelLevel +=
      (gallonsToAdd / state.vehicle.fuelCapacity) * 100;

    const transaction: Transaction = {
      id: generateId(),
      type: "fuel_cost",
      amount: -cost,
      description: `Refueled ${gallonsToAdd.toFixed(1)} gallons at ${ZONE_NAMES[state.currentZone]}`,
      timestamp: new Date(),
      hour: state.hour,
      day: state.day,
    };
    state.transactions.push(transaction);

    return {
      success: true,
      gallonsAdded: gallonsToAdd.toFixed(1),
      pricePerGallon: currentGasPrice.toFixed(2),
      totalCost: cost.toFixed(2),
      newFuelLevel: state.vehicle.fuelLevel.toFixed(1),
      newBalance: state.balance.toFixed(2),
    };
  },
});

/** Get current gas prices across zones */
const getGasPricesTool = tool({
  description: "Check gas prices at all zones to find the cheapest option.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as RideshareState;
    const { zoneInfo, currentZone } = state;

    const prices = Object.entries(zoneInfo)
      .map(([zoneId, info]) => ({
        zone: ZONE_NAMES[zoneId as keyof typeof ZONE_NAMES],
        zoneId,
        pricePerGallon: info.gasPrice.toFixed(2),
        isCurrentZone: zoneId === currentZone,
      }))
      .sort(
        (a, b) =>
          Number.parseFloat(a.pricePerGallon) -
          Number.parseFloat(b.pricePerGallon)
      );

    return {
      currentZone: ZONE_NAMES[currentZone],
      currentPrice: zoneInfo[currentZone]?.gasPrice.toFixed(2) ?? "4.50",
      cheapestZone: prices[0]?.zone,
      cheapestPrice: prices[0]?.pricePerGallon,
      allPrices: prices,
    };
  },
});

/** Schedule vehicle maintenance */
const scheduleMaintenanceTool = tool({
  description:
    "Schedule vehicle service. Basic service costs $50, full service costs $200. Takes you offline briefly.",
  inputSchema: z.object({
    type: z
      .enum(["basic", "full"])
      .describe(
        "Type of service: basic ($50, every 3k miles) or full ($200, every 10k miles)"
      ),
  }),
  execute: ({ type }, { experimental_context }) => {
    const state = experimental_context as RideshareState;

    if (state.currentRide) {
      return {
        success: false,
        error: "Cannot schedule maintenance during an active ride.",
      };
    }

    const cost = type === "basic" ? BASIC_SERVICE_COST : FULL_SERVICE_COST;

    if (state.balance < cost) {
      return {
        success: false,
        error: `Not enough funds. Need $${cost} but only have $${state.balance.toFixed(2)}.`,
      };
    }

    state.balance -= cost;

    const conditionBoost = type === "basic" ? 20 : 50;
    state.vehicle.conditionScore = Math.min(
      100,
      state.vehicle.conditionScore + conditionBoost
    );
    state.vehicle.condition = getConditionFromScore(
      state.vehicle.conditionScore
    );
    state.vehicle.milesSinceService = 0;
    state.vehicle.nextServiceDue =
      type === "basic" ? BASIC_SERVICE_INTERVAL : FULL_SERVICE_INTERVAL;

    if (state.shiftStatus === "online") {
      state.shiftStatus = "offline";
    }

    const transaction: Transaction = {
      id: generateId(),
      type: "maintenance_cost",
      amount: -cost,
      description: `${type === "basic" ? "Basic" : "Full"} vehicle service`,
      timestamp: new Date(),
      hour: state.hour,
      day: state.day,
    };
    state.transactions.push(transaction);

    return {
      success: true,
      serviceType: type,
      cost: cost.toFixed(2),
      newCondition: state.vehicle.condition,
      newConditionScore: state.vehicle.conditionScore,
      nextServiceDue: state.vehicle.nextServiceDue,
      newBalance: state.balance.toFixed(2),
      message: `${type === "basic" ? "Basic" : "Full"} service complete. Vehicle condition improved to ${state.vehicle.condition}.`,
    };
  },
});

export { refuelTool, getGasPricesTool, scheduleMaintenanceTool };
