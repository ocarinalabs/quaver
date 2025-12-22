/**
 * Platform Tools
 *
 * Tools for shift management and events.
 */

import { tool } from "ai";
import { z } from "zod";
import { ZONE_NAMES } from "../../config/constants.js";
import type { RideshareState } from "../../config/types.js";

/** Go online to start accepting ride requests */
const goOnlineTool = tool({
  description:
    "Start your shift and begin accepting ride requests. You must be online to receive rides.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as RideshareState;

    if (state.shiftStatus === "online" || state.shiftStatus === "on_ride") {
      return {
        success: false,
        error: `Already ${state.shiftStatus}. No action needed.`,
      };
    }

    if (state.vehicle.condition === "critical") {
      return {
        success: false,
        error:
          "Vehicle in critical condition. Schedule maintenance before going online.",
      };
    }

    if (state.vehicle.fuelLevel < 10) {
      return {
        success: false,
        error:
          "Fuel too low to go online. Refuel first to avoid running out during a ride.",
      };
    }

    state.shiftStatus = "online";
    state.shiftStartHour = state.hour;

    return {
      success: true,
      status: "online",
      currentZone: ZONE_NAMES[state.currentZone],
      surge: state.surgeMultipliers[state.currentZone]?.toFixed(1) ?? "1.0",
      message: "You are now online and accepting ride requests.",
    };
  },
});

/** Go offline to stop accepting ride requests */
const goOfflineTool = tool({
  description: "End your shift and stop accepting new ride requests.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as RideshareState;

    if (state.shiftStatus === "offline") {
      return {
        success: false,
        error: "Already offline.",
      };
    }

    if (state.currentRide) {
      return {
        success: false,
        error:
          "Cannot go offline during an active ride. Complete the ride first.",
      };
    }

    const shiftDuration =
      state.shiftStartHour !== null ? state.hour - state.shiftStartHour : 0;

    state.shiftStatus = "offline";
    state.shiftStartHour = null;

    return {
      success: true,
      status: "offline",
      shiftDuration,
      earningsThisShift: state.stats.earningsToday.toFixed(2),
      ridesThisShift: state.stats.ridesToday,
      message: "You are now offline and will not receive new ride requests.",
    };
  },
});

/** Check upcoming and current events */
const checkEventsTool = tool({
  description:
    "Check city events that affect demand and surge pricing. Events are announced 24h ahead.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as RideshareState;
    const { cityEvents, day, hour } = state;

    const currentEvents = cityEvents.filter(
      (event) =>
        event.day === day &&
        event.startHour <= hour &&
        event.endHour > hour &&
        event.announced
    );

    const upcomingEvents = cityEvents.filter(
      (event) =>
        event.announced &&
        (event.day > day || (event.day === day && event.startHour > hour)) &&
        event.day <= day + 1
    );

    return {
      currentHour: hour,
      currentDay: day,
      weather: state.weatherCondition,
      currentEvents: currentEvents.map((event) => ({
        name: event.name,
        type: event.type,
        zone: ZONE_NAMES[event.zone],
        zoneId: event.zone,
        endsAtHour: event.endHour,
        surgeMultiplier: event.surgeMultiplier,
      })),
      upcomingEvents: upcomingEvents.map((event) => ({
        name: event.name,
        type: event.type,
        zone: ZONE_NAMES[event.zone],
        zoneId: event.zone,
        day: event.day,
        startsAtHour: event.startHour,
        endsAtHour: event.endHour,
        expectedSurge: event.surgeMultiplier,
      })),
    };
  },
});

export { goOnlineTool, goOfflineTool, checkEventsTool };
