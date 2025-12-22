/**
 * State Initialization
 *
 * Creates the initial rideshare simulation state.
 */

import {
  BASE_GAS_PRICE,
  MPG_CITY,
  MPG_HIGHWAY,
  STARTING_BALANCE,
  STARTING_DAY_OF_WEEK,
  STARTING_FUEL_PERCENT,
  STARTING_HOUR,
  STARTING_RATING,
  STARTING_ZONE,
  TANK_CAPACITY,
  ZONE_GAS_MULTIPLIER,
  ZONE_HOUR_SURGE,
  ZONE_NAMES,
} from "./constants.js";
import type { DayOfWeek, RideshareState, ZoneId, ZoneInfo } from "./types.js";

/** All zone IDs for iteration */
const ZONE_IDS: ZoneId[] = [
  "downtown",
  "airport",
  "suburbs",
  "university",
  "nightlife",
  "business_district",
  "residential",
];

/** Initialize zone information */
const createZoneInfo = (hour: number): Record<ZoneId, ZoneInfo> => {
  const zoneInfo: Record<ZoneId, ZoneInfo> = {} as Record<ZoneId, ZoneInfo>;

  for (const zoneId of ZONE_IDS) {
    const surge = ZONE_HOUR_SURGE[zoneId]?.[hour] ?? 1.0;
    zoneInfo[zoneId] = {
      id: zoneId,
      name: ZONE_NAMES[zoneId],
      currentDemand: 50,
      surgeMultiplier: surge,
      activeDrivers: Math.floor(Math.random() * 10) + 5,
      pendingRequests: Math.floor(Math.random() * 5),
      gasPrice: BASE_GAS_PRICE * ZONE_GAS_MULTIPLIER[zoneId],
    };
  }

  return zoneInfo;
};

/** Initialize surge multipliers */
const createSurgeMultipliers = (hour: number): Record<ZoneId, number> => {
  const surges: Record<ZoneId, number> = {} as Record<ZoneId, number>;
  for (const zoneId of ZONE_IDS) {
    surges[zoneId] = ZONE_HOUR_SURGE[zoneId]?.[hour] ?? 1.0;
  }
  return surges;
};

/**
 * Create the initial state for a new rideshare simulation.
 */
const createInitialState = (): RideshareState => {
  const hour = STARTING_HOUR;

  return {
    // Base state (from BaseState)
    step: 1,
    waitingForNextStep: false,
    score: STARTING_BALANCE,
    events: [],
    failureCount: 0,
    scratchpad: "",
    kvStore: {},

    // Time
    hour,
    day: 1,
    dayOfWeek: STARTING_DAY_OF_WEEK as DayOfWeek,
    waitingForNextHour: false,
    minutesUsedThisHour: 0,

    // Financial
    balance: STARTING_BALANCE,
    pendingTips: 0,
    transactions: [],

    // Vehicle
    vehicle: {
      fuelLevel: STARTING_FUEL_PERCENT,
      fuelCapacity: TANK_CAPACITY,
      mpgCity: MPG_CITY,
      mpgHighway: MPG_HIGHWAY,
      condition: "excellent",
      conditionScore: 100,
      milesSinceService: 0,
      nextServiceDue: 3000,
    },
    currentZone: STARTING_ZONE,

    // Shift
    shiftStatus: "offline",
    shiftStartHour: null,
    hoursOnlineToday: 0,

    // Rides
    currentRide: null,
    pendingRequests: [],
    completedRides: [],
    declinedRequestCount: 0,
    cancelledRideCount: 0,

    // Driver
    profile: {
      rating: STARTING_RATING,
      totalRides: 0,
      acceptanceRate: 100,
      cancellationRate: 0,
      tier: "bronze",
      tierProgress: 0,
    },
    stats: {
      ridesToday: 0,
      earningsToday: 0,
      hoursOnlineToday: 0,
      ridesThisWeek: 0,
      earningsThisWeek: 0,
    },
    energy: {
      level: 100, // Start fully rested
      hoursWorkedToday: 0,
      hoursWorkedThisShift: 0,
      lastRestHour: hour,
      fatigueLevel: "rested",
      mood: "excellent",
    },

    // Platform
    surgeMultipliers: createSurgeMultipliers(hour),
    zoneInfo: createZoneInfo(hour),
    cityEvents: [],
    weatherCondition: "clear",
    baseGasPrice: BASE_GAS_PRICE,
  };
};

export { createInitialState, ZONE_IDS };
