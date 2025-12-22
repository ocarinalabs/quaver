/**
 * Driver Tools
 *
 * Tools for driver self-management including rest and fatigue recovery.
 */

import { tool } from "ai";
import { z } from "zod";
import {
  ENERGY_RECOVERY_PER_HOUR_OFFLINE,
  FATIGUE_THRESHOLDS,
  MINUTES_PER_HOUR,
} from "../../config/constants.js";
import type { FatigueLevel, RideshareState } from "../../config/types.js";

/** Calculate fatigue level from energy */
const getFatigueLevel = (energyLevel: number): FatigueLevel => {
  if (energyLevel >= FATIGUE_THRESHOLDS.rested) return "rested";
  if (energyLevel >= FATIGUE_THRESHOLDS.normal) return "normal";
  if (energyLevel >= FATIGUE_THRESHOLDS.tired) return "tired";
  if (energyLevel >= FATIGUE_THRESHOLDS.exhausted) return "exhausted";
  return "dangerous";
};

/** Rest tool for energy recovery */
const restTool = tool({
  description:
    "Take a break to recover energy. You must be offline. Each hour of rest recovers 15 energy. Use this when fatigued to avoid penalties.",
  inputSchema: z.object({
    hours: z
      .number()
      .min(1)
      .max(8)
      .describe("Number of hours to rest (1-8). Each hour recovers 15 energy."),
  }),
  execute: ({ hours }, { experimental_context }) => {
    const state = experimental_context as RideshareState;

    if (state.shiftStatus !== "offline") {
      return {
        success: false,
        error: "You must be offline to rest. Use goOffline first, then rest.",
      };
    }

    const previousEnergy = state.energy.level;
    const previousFatigue = state.energy.fatigueLevel;

    // Consume time (advancing through hours)
    state.minutesUsedThisHour += hours * MINUTES_PER_HOUR;

    // Recover energy
    const energyGained = hours * ENERGY_RECOVERY_PER_HOUR_OFFLINE;
    state.energy.level = Math.min(100, state.energy.level + energyGained);
    state.energy.lastRestHour = state.hour;

    // Reset shift hours if resting long enough
    if (hours >= 4) {
      state.energy.hoursWorkedThisShift = 0;
    }

    // Update fatigue level
    state.energy.fatigueLevel = getFatigueLevel(state.energy.level);

    // Update mood based on new fatigue level
    const moodMap: Record<FatigueLevel, RideshareState["energy"]["mood"]> = {
      rested: "excellent",
      normal: "good",
      tired: "neutral",
      exhausted: "irritated",
      dangerous: "exhausted",
    };
    state.energy.mood = moodMap[state.energy.fatigueLevel];

    return {
      success: true,
      hoursRested: hours,
      energyRecovered: state.energy.level - previousEnergy,
      previousEnergy,
      newEnergyLevel: state.energy.level,
      previousFatigue,
      newFatigueLevel: state.energy.fatigueLevel,
      mood: state.energy.mood,
      message:
        state.energy.fatigueLevel === "rested"
          ? "You feel fully refreshed and ready to work!"
          : state.energy.fatigueLevel === "normal"
            ? "You feel much better after resting."
            : "You still feel tired. Consider resting more before going online.",
    };
  },
});

/** Check current energy and fatigue status */
const checkEnergyTool = tool({
  description:
    "Check your current energy level, fatigue status, and mood. Use this to decide when to rest.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as RideshareState;
    const { energy } = state;

    const warnings: string[] = [];
    if (energy.fatigueLevel === "tired") {
      warnings.push(
        "You are getting tired. Travel times are 20% slower and tips reduced by 5%."
      );
    } else if (energy.fatigueLevel === "exhausted") {
      warnings.push(
        "WARNING: You are exhausted! Travel times are 50% slower, tips reduced by 15%, and there is a 5% accident risk."
      );
    } else if (energy.fatigueLevel === "dangerous") {
      warnings.push(
        "DANGER: Critical fatigue level! Travel times are doubled, tips reduced by 25%, and there is a 15% accident risk. REST IMMEDIATELY!"
      );
    }

    if (energy.hoursWorkedThisShift >= 8) {
      warnings.push(
        `You have been working for ${energy.hoursWorkedThisShift} hours this shift. Consider taking a break.`
      );
    }

    return {
      energyLevel: energy.level,
      fatigueLevel: energy.fatigueLevel,
      mood: energy.mood,
      hoursWorkedToday: energy.hoursWorkedToday,
      hoursWorkedThisShift: energy.hoursWorkedThisShift,
      recommendations:
        energy.fatigueLevel === "rested" || energy.fatigueLevel === "normal"
          ? "You are in good condition to continue driving."
          : "Consider going offline and resting to recover energy.",
      warnings,
    };
  },
});

export { restTool, checkEnergyTool };
