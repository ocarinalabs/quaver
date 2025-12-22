/**
 * Navigation Tools
 *
 * Tools for moving between zones and checking zone information.
 */

import { tool } from "ai";
import { z } from "zod";
import {
  MINUTES_PER_HOUR,
  MINUTES_PER_MILE_CITY,
  MPG_CITY,
  ZONE_DISTANCES,
  ZONE_NAMES,
} from "../../config/constants.js";
import { ZONE_IDS } from "../../config/init.js";
import type { RideshareState, ZoneId } from "../../config/types.js";

const zoneIdSchema = z.enum([
  "downtown",
  "airport",
  "suburbs",
  "university",
  "nightlife",
  "business_district",
  "residential",
]);

/** Get current location with distances to other zones */
const getCurrentLocationTool = tool({
  description: "Get your current zone and distances to all other zones",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as RideshareState;
    const { currentZone, zoneInfo, surgeMultipliers } = state;

    const nearbyZones = ZONE_IDS.filter((zoneId) => zoneId !== currentZone).map(
      (zoneId) => ({
        zone: ZONE_NAMES[zoneId],
        zoneId,
        distance: ZONE_DISTANCES[currentZone]?.[zoneId] ?? 0,
        surge: surgeMultipliers[zoneId]?.toFixed(1) ?? "1.0",
        demand: zoneInfo[zoneId]?.currentDemand ?? 50,
        gasPrice: zoneInfo[zoneId]?.gasPrice?.toFixed(2) ?? "4.50",
      })
    );

    return {
      currentZone: ZONE_NAMES[currentZone],
      currentZoneId: currentZone,
      currentSurge: surgeMultipliers[currentZone]?.toFixed(1) ?? "1.0",
      nearbyZones,
    };
  },
});

/** Get detailed information about zones */
const getZoneInfoTool = tool({
  description:
    "Get surge multipliers, demand levels, and driver counts for zones. Omit zone to get all zones.",
  inputSchema: z.object({
    zone: zoneIdSchema
      .optional()
      .describe("Specific zone to check, or omit for all zones"),
  }),
  execute: ({ zone }, { experimental_context }) => {
    const state = experimental_context as RideshareState;
    const { zoneInfo, surgeMultipliers, currentZone, weatherCondition, hour } =
      state;

    const formatZone = (zoneId: ZoneId) => {
      const info = zoneInfo[zoneId];
      return {
        zone: ZONE_NAMES[zoneId],
        zoneId,
        surge: surgeMultipliers[zoneId]?.toFixed(1) ?? "1.0",
        demand: info?.currentDemand ?? 50,
        activeDrivers: info?.activeDrivers ?? 0,
        pendingRequests: info?.pendingRequests ?? 0,
        gasPrice: info?.gasPrice?.toFixed(2) ?? "4.50",
        distanceFromYou: ZONE_DISTANCES[currentZone]?.[zoneId] ?? 0,
      };
    };

    if (zone) {
      return {
        weather: weatherCondition,
        hour,
        zone: formatZone(zone),
      };
    }

    return {
      weather: weatherCondition,
      hour,
      zones: ZONE_IDS.map(formatZone),
    };
  },
});

/** Drive to a different zone (consumes fuel) */
const goToZoneTool = tool({
  description:
    "Drive to a different zone. This consumes fuel based on distance. You cannot drive while on a ride.",
  inputSchema: z.object({
    zone: zoneIdSchema.describe("The zone to drive to"),
  }),
  execute: ({ zone }, { experimental_context }) => {
    const state = experimental_context as RideshareState;

    if (state.currentRide) {
      return {
        success: false,
        error:
          "Cannot change zones while on a ride. Complete or cancel the current ride first.",
      };
    }

    if (zone === state.currentZone) {
      return {
        success: false,
        error: `You are already in ${ZONE_NAMES[zone]}.`,
      };
    }

    const distance = ZONE_DISTANCES[state.currentZone]?.[zone] ?? 0;
    const travelMinutes = Math.ceil(distance * MINUTES_PER_MILE_CITY);
    const fuelUsed = distance / MPG_CITY;
    const fuelPercent = (fuelUsed / state.vehicle.fuelCapacity) * 100;

    if (state.vehicle.fuelLevel < fuelPercent) {
      return {
        success: false,
        error: `Not enough fuel. Need ${fuelPercent.toFixed(1)}% but only have ${state.vehicle.fuelLevel.toFixed(1)}%.`,
      };
    }

    const previousZone = state.currentZone;
    state.currentZone = zone;
    state.vehicle.fuelLevel -= fuelPercent;
    state.vehicle.milesSinceService += distance;

    // Consume time
    state.minutesUsedThisHour += travelMinutes;

    // Check if hour should advance
    if (state.minutesUsedThisHour >= MINUTES_PER_HOUR) {
      state.waitingForNextHour = true;
    }

    return {
      success: true,
      previousZone: ZONE_NAMES[previousZone],
      newZone: ZONE_NAMES[zone],
      distance,
      timeUsed: `${travelMinutes} minutes`,
      fuelUsed: fuelPercent.toFixed(1),
      fuelRemaining: state.vehicle.fuelLevel.toFixed(1),
      minutesUsedThisHour: state.minutesUsedThisHour,
      hourAdvancing: state.waitingForNextHour,
      newSurge: state.surgeMultipliers[zone]?.toFixed(1) ?? "1.0",
    };
  },
});

export { getCurrentLocationTool, getZoneInfoTool, goToZoneTool };
