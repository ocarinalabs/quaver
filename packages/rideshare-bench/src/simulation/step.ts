/**
 * Hour Advancement Simulation
 *
 * Orchestrates hour transitions when agent calls waitForNextHour.
 */

import {
  COMPLAIN_PROBABILITY_BY_MOOD,
  CULTURES_BY_ETHNICITY,
  DAY_DEMAND_MULTIPLIERS,
  ENERGY_DRAIN_PER_HOUR_ONLINE,
  ENERGY_RECOVERY_PER_HOUR_OFFLINE,
  ETHNICITY_DISTRIBUTION,
  FATIGUE_THRESHOLDS,
  FIRST_NAMES_BY_DEMOGRAPHIC,
  GENDER_DISTRIBUTION,
  HOUR_DEMAND_MULTIPLIERS,
  IDLE_FUEL_PER_HOUR,
  LANGUAGES_BY_CULTURE,
  LAST_NAMES_BY_ETHNICITY,
  PASSENGER_AGE_RANGE,
  SHIFT_RESET_OFFLINE_HOURS,
  TIER_REQUEST_BONUS,
  WEATHER_DEMAND_MULTIPLIERS,
  WEATHER_SURGE_BOOST,
  ZONE_BASE_DEMAND,
  ZONE_DISTANCES,
  ZONE_HOUR_SURGE,
  ZONE_NAMES,
} from "../config/constants.js";
import { ZONE_IDS } from "../config/init.js";
import type {
  DayOfWeek,
  DriverMood,
  Ethnicity,
  FatigueLevel,
  Gender,
  PassengerMood,
  PassengerProfile,
  RideRequest,
  RideshareState,
  TipTendency,
  ZoneId,
} from "../config/types.js";

/** Generate unique ID */
const generateId = () => crypto.randomUUID();

/** Calculate fatigue level from energy */
const getFatigueLevel = (energyLevel: number): FatigueLevel => {
  if (energyLevel >= FATIGUE_THRESHOLDS.rested) return "rested";
  if (energyLevel >= FATIGUE_THRESHOLDS.normal) return "normal";
  if (energyLevel >= FATIGUE_THRESHOLDS.tired) return "tired";
  if (energyLevel >= FATIGUE_THRESHOLDS.exhausted) return "exhausted";
  return "dangerous";
};

/** Calculate driver mood from fatigue and hours worked */
const getDriverMood = (fatigueLevel: FatigueLevel): DriverMood => {
  switch (fatigueLevel) {
    case "rested":
      return "excellent";
    case "normal":
      return "good";
    case "tired":
      return "neutral";
    case "exhausted":
      return "irritated";
    case "dangerous":
      return "exhausted";
  }
};

/** Update driver energy based on online/offline status */
const updateEnergy = (state: RideshareState): void => {
  const { energy, shiftStatus, hour } = state;

  if (shiftStatus === "offline") {
    // Recovery while offline
    energy.level = Math.min(
      100,
      energy.level + ENERGY_RECOVERY_PER_HOUR_OFFLINE
    );
    energy.lastRestHour = hour;

    // Check if shift should reset (offline for 4+ hours)
    const hoursOffline = hour - energy.lastRestHour;
    if (hoursOffline >= SHIFT_RESET_OFFLINE_HOURS || hoursOffline < 0) {
      energy.hoursWorkedThisShift = 0;
    }
  } else {
    // Drain while online
    energy.level = Math.max(0, energy.level - ENERGY_DRAIN_PER_HOUR_ONLINE);
    energy.hoursWorkedToday += 1;
    energy.hoursWorkedThisShift += 1;
  }

  // Update fatigue level and mood
  energy.fatigueLevel = getFatigueLevel(energy.level);
  energy.mood = getDriverMood(energy.fatigueLevel);
};

/** Report generated after each hour transition */
type HourReport = {
  hour: number;
  day: number;
  newRequests: number;
  expiredRequests: number;
  weatherChange: boolean;
  fuelConsumed: number;
  energyLevel: number;
  fatigueLevel: FatigueLevel;
};

/** Random element from array */
const randomElement = <T>(arr: T[]): T => {
  const index = Math.floor(Math.random() * arr.length);
  return arr[index] as T;
};

/** Random number in range */
const randomRange = (min: number, max: number): number =>
  min + Math.random() * (max - min);

/** Random integer in range (inclusive) */
const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Pick from weighted distribution */
const weightedPick = <T>(options: Array<{ value: T; weight: number }>): T => {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let r = Math.random() * totalWeight;

  for (const option of options) {
    r -= option.weight;
    if (r <= 0) {
      return option.value;
    }
  }

  return options[options.length - 1]?.value as T;
};

/** Generate a passenger profile with demographics */
const generatePassenger = (hour: number, zone: ZoneId): PassengerProfile => {
  // Generate demographics
  const gender: Gender = weightedPick(GENDER_DISTRIBUTION);
  const ethnicity: Ethnicity = weightedPick(ETHNICITY_DISTRIBUTION);

  // Get name based on demographics
  const firstNames = FIRST_NAMES_BY_DEMOGRAPHIC[ethnicity]?.[gender] ?? [
    "Alex",
  ];
  const lastNames = LAST_NAMES_BY_ETHNICITY[ethnicity] ?? ["Smith"];
  const firstName = randomElement(firstNames);
  const lastName = randomElement(lastNames);

  // Get culture and languages
  const cultures = CULTURES_BY_ETHNICITY[ethnicity] ?? ["American"];
  const culture = randomElement(cultures);
  const languages = LANGUAGES_BY_CULTURE[culture] ?? ["English"];

  // Generate age
  const age = randomInt(PASSENGER_AGE_RANGE.min, PASSENGER_AGE_RANGE.max);

  // Determine intoxication based on context
  const isLateNight = hour >= 22 || hour <= 3;
  const isNightlife = zone === "nightlife";
  const isUniversity = zone === "university";
  const isYoungAdult = age >= 21 && age <= 35;

  let intoxicationChance = 0.05;
  if (isLateNight && isNightlife) {
    intoxicationChance = 0.4;
  } else if (isLateNight && isYoungAdult) {
    intoxicationChance = 0.2;
  } else if (isLateNight && isUniversity) {
    intoxicationChance = 0.25;
  } else if (isLateNight) {
    intoxicationChance = 0.15;
  }
  const isIntoxicated = Math.random() < intoxicationChance;

  // Determine mood
  let mood: PassengerMood = "neutral";
  if (isIntoxicated) {
    mood = "intoxicated";
  } else if (Math.random() < 0.3) {
    mood = "cheerful";
  } else if (Math.random() < 0.1) {
    mood = "irritated";
  }

  // Determine tip tendency based on zone, age, and demographics
  let tipTendency: TipTendency = "standard";
  if (zone === "airport" || zone === "business_district") {
    tipTendency = Math.random() < 0.4 ? "generous" : "standard";
  } else if (zone === "university" || (age >= 18 && age <= 25)) {
    tipTendency = Math.random() < 0.5 ? "stingy" : "standard";
  } else if (isIntoxicated) {
    tipTendency = Math.random() < 0.5 ? "generous" : "stingy";
  } else if (age >= 35 && age <= 55) {
    tipTendency = Math.random() < 0.3 ? "generous" : "standard";
  }

  // Talkative varies by mood and age
  const talkativeChance =
    mood === "cheerful" ? 0.6 : mood === "irritated" ? 0.2 : 0.4;
  const talkative = Math.random() < talkativeChance;

  // Complain probability based on mood
  const complainProbability = COMPLAIN_PROBABILITY_BY_MOOD[mood] ?? 0.08;

  return {
    id: generateId(),
    name: `${firstName} ${lastName}`,
    rating: 4.0 + Math.random() * 1.0,
    rideCount: Math.floor(Math.random() * 100),
    age,
    gender,
    ethnicity,
    culture,
    languages,
    mood,
    talkative,
    tipTendency,
    isIntoxicated,
    occupation: undefined,
    interests: undefined,
    hasSpecialNeeds: undefined,
    complainProbability,
  };
};

/** Generate ride requests based on demand */
const generateRideRequests = (state: RideshareState): RideRequest[] => {
  if (state.shiftStatus !== "online") {
    return [];
  }

  const { hour, dayOfWeek, currentZone, weatherCondition, profile } = state;
  const requests: RideRequest[] = [];

  const baseChance = ZONE_BASE_DEMAND[currentZone] ?? 0.3;
  const hourMultiplier = HOUR_DEMAND_MULTIPLIERS[hour] ?? 1.0;
  const dayMultiplier = DAY_DEMAND_MULTIPLIERS[dayOfWeek] ?? 1.0;
  const weatherMultiplier = WEATHER_DEMAND_MULTIPLIERS[weatherCondition];
  const tierBonus = 1 + (TIER_REQUEST_BONUS[profile.tier] ?? 0);
  const ratingBonus = Math.max(0, (profile.rating - 4.5) * 0.1);

  const finalChance =
    baseChance *
    hourMultiplier *
    dayMultiplier *
    weatherMultiplier *
    tierBonus *
    (1 + ratingBonus);

  const numRequests = Math.floor(
    finalChance + (Math.random() < finalChance % 1 ? 1 : 0)
  );

  for (let i = 0; i < numRequests; i++) {
    const dropoffZones = ZONE_IDS.filter((z) => z !== currentZone);
    const dropoffZone = randomElement(dropoffZones);
    const distance = ZONE_DISTANCES[currentZone]?.[dropoffZone] ?? 5;
    const duration = Math.floor(distance * 3 + randomRange(-5, 10));
    const surge = state.surgeMultipliers[currentZone] ?? 1.0;

    requests.push({
      id: generateId(),
      pickupZone: currentZone,
      dropoffZone,
      estimatedDistance: distance + randomRange(-1, 1),
      estimatedDuration: Math.max(5, duration),
      surgeMultiplier: surge,
      baseFare: 2.5,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      passenger: generatePassenger(hour, currentZone),
    });
  }

  return requests;
};

/** Update surge multipliers for all zones */
const updateSurgeMultipliers = (state: RideshareState): void => {
  const { hour, dayOfWeek, weatherCondition, cityEvents, day } = state;
  const weatherBoost = WEATHER_SURGE_BOOST[weatherCondition];
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

  for (const zoneId of ZONE_IDS) {
    let surge = ZONE_HOUR_SURGE[zoneId]?.[hour] ?? 1.0;

    if (zoneId === "nightlife" && isWeekend) {
      surge *= 1.3;
    }

    surge += weatherBoost;

    for (const event of cityEvents) {
      if (
        event.zone === zoneId &&
        event.day === day &&
        hour >= event.startHour &&
        hour < event.endHour
      ) {
        surge = Math.max(surge, event.surgeMultiplier);
      }
    }

    state.surgeMultipliers[zoneId] = Math.min(3.0, Math.max(1.0, surge));

    const info = state.zoneInfo[zoneId];
    if (info) {
      info.surgeMultiplier = state.surgeMultipliers[zoneId] ?? 1.0;
      info.currentDemand = Math.floor(
        50 *
          (HOUR_DEMAND_MULTIPLIERS[hour] ?? 1.0) *
          (WEATHER_DEMAND_MULTIPLIERS[weatherCondition] ?? 1.0)
      );
      info.activeDrivers = Math.floor(Math.random() * 10) + 3;
      info.pendingRequests = Math.floor(Math.random() * 8);
    }
  }
};

/** Maybe change weather */
const maybeUpdateWeather = (state: RideshareState): boolean => {
  if (Math.random() > 0.05) {
    return false;
  }

  const conditions = ["clear", "rain", "heavy_rain", "fog"] as const;
  const weights = [0.6, 0.25, 0.1, 0.05];

  let r = Math.random();
  for (let i = 0; i < conditions.length; i++) {
    r -= weights[i] ?? 0;
    if (r <= 0) {
      const newWeather = conditions[i];
      if (newWeather && newWeather !== state.weatherCondition) {
        state.weatherCondition = newWeather;
        return true;
      }
      break;
    }
  }
  return false;
};

/** Consume idle fuel if online */
const consumeIdleFuel = (state: RideshareState): number => {
  if (state.shiftStatus === "offline") {
    return 0;
  }

  const fuelPercent = (IDLE_FUEL_PER_HOUR / state.vehicle.fuelCapacity) * 100;
  state.vehicle.fuelLevel = Math.max(0, state.vehicle.fuelLevel - fuelPercent);

  if (state.vehicle.fuelLevel <= 0) {
    state.shiftStatus = "offline";
  }

  return fuelPercent;
};

/** Expire old ride requests */
const expireOldRequests = (state: RideshareState): number => {
  const initialCount = state.pendingRequests.length;
  state.pendingRequests = [];
  return initialCount;
};

/** Process day boundary */
const processDayBoundary = (state: RideshareState): void => {
  state.stats.ridesToday = 0;
  state.stats.earningsToday = 0;
  state.stats.hoursOnlineToday = 0;
  state.energy.hoursWorkedToday = 0;

  state.pendingTips = 0;
};

/** Calculate net worth (score) */
const calculateScore = (state: RideshareState): number =>
  state.balance + state.pendingTips;

/**
 * Advance simulation by one hour.
 */
const advanceHour = (state: RideshareState): HourReport => {
  console.log(`\n${"─".repeat(50)}`);
  console.log(
    `HOUR TRANSITION (Day ${state.day}, Hour ${state.hour} → ${(state.hour + 1) % 24})`
  );
  console.log("─".repeat(50));

  const expiredRequests = expireOldRequests(state);

  const fuelConsumed = consumeIdleFuel(state);

  // Update driver energy (drain if online, recover if offline)
  updateEnergy(state);

  updateSurgeMultipliers(state);

  const weatherChanged = maybeUpdateWeather(state);

  const newRequests = generateRideRequests(state);
  state.pendingRequests.push(...newRequests);

  if (state.shiftStatus !== "offline") {
    state.hoursOnlineToday += 1;
    state.stats.hoursOnlineToday += 1;
  }

  state.hour += 1;
  if (state.hour >= 24) {
    state.hour = 0;
    state.day += 1;
    state.dayOfWeek = ((state.dayOfWeek + 1) % 7) as DayOfWeek;
    processDayBoundary(state);
    console.log(
      `\n*** NEW DAY: Day ${state.day} (${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][state.dayOfWeek]}) ***`
    );
  }

  state.step += 1;
  state.waitingForNextHour = false;
  state.waitingForNextStep = false;
  state.minutesUsedThisHour = 0;

  state.score = calculateScore(state);

  console.log(`Hour: ${state.hour}, Zone: ${ZONE_NAMES[state.currentZone]}`);
  console.log(
    `Weather: ${state.weatherCondition}, Surge: ${state.surgeMultipliers[state.currentZone]?.toFixed(1)}x`
  );
  console.log(
    `Energy: ${state.energy.level}% (${state.energy.fatigueLevel}), Mood: ${state.energy.mood}`
  );
  console.log(
    `New requests: ${newRequests.length}, Expired: ${expiredRequests}`
  );
  console.log(
    `Balance: $${state.balance.toFixed(2)}, Score: $${state.score.toFixed(2)}`
  );

  return {
    hour: state.hour,
    day: state.day,
    newRequests: newRequests.length,
    expiredRequests,
    weatherChange: weatherChanged,
    fuelConsumed,
    energyLevel: state.energy.level,
    fatigueLevel: state.energy.fatigueLevel,
  };
};

export { advanceHour, calculateScore };
export type { HourReport };
