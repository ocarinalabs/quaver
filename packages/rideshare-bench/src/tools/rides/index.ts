/**
 * Ride Tools
 *
 * Tools for viewing, accepting, and completing rides.
 */

import { tool } from "ai";
import { z } from "zod";
import {
  BASE_FARE,
  DROPOFF_MINUTES,
  ENERGY_DRAIN_PER_RIDE,
  FATIGUE_RATING_MODIFIER,
  FATIGUE_THRESHOLDS,
  FATIGUE_TIP_MODIFIER,
  FATIGUE_TRAVEL_MULTIPLIER,
  MIN_FARE,
  MINUTES_PER_HOUR,
  MINUTES_PER_MILE_CITY,
  MPG_CITY,
  PER_MILE_RATE,
  PER_MINUTE_RATE,
  PICKUP_WAIT_MINUTES,
  PLATFORM_CUT,
  TIP_PERCENTAGES,
  ZONE_DISTANCES,
  ZONE_NAMES,
} from "../../config/constants.js";
import type {
  CompletedRide,
  FatigueLevel,
  RideshareState,
  Transaction,
} from "../../config/types.js";

/** Calculate fatigue level from energy */
const getFatigueLevel = (energyLevel: number): FatigueLevel => {
  if (energyLevel >= FATIGUE_THRESHOLDS.rested) return "rested";
  if (energyLevel >= FATIGUE_THRESHOLDS.normal) return "normal";
  if (energyLevel >= FATIGUE_THRESHOLDS.tired) return "tired";
  if (energyLevel >= FATIGUE_THRESHOLDS.exhausted) return "exhausted";
  return "dangerous";
};

/** Generate a unique ID */
const generateId = () => crypto.randomUUID();

/** View pending ride requests */
const viewPendingRequestsTool = tool({
  description:
    "See available ride requests with fare estimates, surge multipliers, and passenger info. Must be online to see requests.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as RideshareState;

    if (state.shiftStatus === "offline") {
      return {
        success: false,
        error: "You must be online to view ride requests. Use goOnline first.",
        requests: [],
      };
    }

    if (state.currentRide) {
      return {
        success: false,
        error: "Complete your current ride before viewing new requests.",
        requests: [],
      };
    }

    const requests = state.pendingRequests.map((r) => {
      const platformFee = PLATFORM_CUT[state.profile.tier];
      const grossFare = Math.max(
        MIN_FARE,
        BASE_FARE +
          r.estimatedDistance * PER_MILE_RATE * r.surgeMultiplier +
          r.estimatedDuration * PER_MINUTE_RATE
      );
      const netFare = grossFare * (1 - platformFee);

      return {
        id: r.id,
        pickup: ZONE_NAMES[r.pickupZone],
        dropoff: ZONE_NAMES[r.dropoffZone],
        distance: r.estimatedDistance.toFixed(1),
        duration: r.estimatedDuration,
        surge: r.surgeMultiplier.toFixed(1),
        grossFare: grossFare.toFixed(2),
        netFare: netFare.toFixed(2),
        platformFee: `${(platformFee * 100).toFixed(0)}%`,
        passenger: {
          name: r.passenger.name,
          rating: r.passenger.rating.toFixed(1),
          rideCount: r.passenger.rideCount,
          age: r.passenger.age,
          gender: r.passenger.gender,
          ethnicity: r.passenger.ethnicity,
          culture: r.passenger.culture,
          languages: r.passenger.languages.join(", "),
          mood: r.passenger.isIntoxicated ? "intoxicated" : r.passenger.mood,
          talkative: r.passenger.talkative,
        },
      };
    });

    return {
      success: true,
      currentZone: ZONE_NAMES[state.currentZone],
      requestCount: requests.length,
      requests,
    };
  },
});

/** Accept a ride request */
const acceptRideTool = tool({
  description:
    "Accept a pending ride request. The passenger will be picked up from the pickup zone.",
  inputSchema: z.object({
    rideId: z.string().describe("The ID of the ride request to accept"),
  }),
  execute: ({ rideId }, { experimental_context }) => {
    const state = experimental_context as RideshareState;

    if (state.shiftStatus === "offline") {
      return {
        success: false,
        error: "You must be online to accept rides.",
      };
    }

    if (state.currentRide) {
      return {
        success: false,
        error: "You already have an active ride. Complete it first.",
      };
    }

    const requestIndex = state.pendingRequests.findIndex(
      (r) => r.id === rideId
    );
    if (requestIndex === -1) {
      return {
        success: false,
        error: "Ride request not found. It may have expired or been taken.",
      };
    }

    const request = state.pendingRequests[requestIndex];
    if (!request) {
      return {
        success: false,
        error: "Ride request not found.",
      };
    }

    state.pendingRequests.splice(requestIndex, 1);

    state.currentRide = {
      id: request.id,
      request,
      status: "accepted",
      acceptedAt: new Date(),
      startedAt: null,
      completedAt: null,
      messages: [],
      actualDistance: request.estimatedDistance,
      actualDuration: request.estimatedDuration,
      tipAmount: 0,
      ratingGiven: null,
    };

    state.shiftStatus = "on_ride";

    const distanceToPickup =
      ZONE_DISTANCES[state.currentZone]?.[request.pickupZone] ?? 0;

    return {
      success: true,
      rideId: request.id,
      passenger: request.passenger.name,
      pickup: ZONE_NAMES[request.pickupZone],
      dropoff: ZONE_NAMES[request.dropoffZone],
      distanceToPickup,
      message:
        distanceToPickup > 0
          ? `Ride accepted. Drive ${distanceToPickup} miles to ${ZONE_NAMES[request.pickupZone]} for pickup.`
          : "Ride accepted. Passenger is nearby. Use startRide when ready.",
    };
  },
});

/** Decline a ride request */
const declineRideTool = tool({
  description: "Decline a ride request. This affects your acceptance rate.",
  inputSchema: z.object({
    rideId: z.string().describe("The ID of the ride request to decline"),
  }),
  execute: ({ rideId }, { experimental_context }) => {
    const state = experimental_context as RideshareState;

    const requestIndex = state.pendingRequests.findIndex(
      (r) => r.id === rideId
    );
    if (requestIndex === -1) {
      return {
        success: false,
        error: "Ride request not found.",
      };
    }

    state.pendingRequests.splice(requestIndex, 1);
    state.declinedRequestCount += 1;

    const totalRequests =
      state.profile.totalRides +
      state.declinedRequestCount +
      state.cancelledRideCount;
    state.profile.acceptanceRate =
      totalRequests > 0
        ? ((totalRequests - state.declinedRequestCount) / totalRequests) * 100
        : 100;

    return {
      success: true,
      newAcceptanceRate: state.profile.acceptanceRate.toFixed(1),
      message: "Ride declined. Your acceptance rate has been updated.",
    };
  },
});

/** Start the ride - travels to pickup zone, picks up passenger */
const startRideTool = tool({
  description:
    "Start the ride. This travels to the pickup zone (consumes time and fuel), then picks up the passenger.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as RideshareState;

    if (!state.currentRide) {
      return {
        success: false,
        error: "No active ride to start. Accept a ride first.",
      };
    }

    if (state.currentRide.status !== "accepted") {
      return {
        success: false,
        error: `Ride is already ${state.currentRide.status}.`,
      };
    }

    const pickupZone = state.currentRide.request.pickupZone;
    const distanceToPickup =
      ZONE_DISTANCES[state.currentZone]?.[pickupZone] ?? 0;

    // Calculate travel time to pickup
    const travelMinutes = Math.ceil(distanceToPickup * MINUTES_PER_MILE_CITY);
    const totalMinutes = travelMinutes + PICKUP_WAIT_MINUTES;

    // Calculate and consume fuel for travel to pickup
    const fuelUsed = distanceToPickup / MPG_CITY;
    const fuelPercent = (fuelUsed / state.vehicle.fuelCapacity) * 100;

    if (state.vehicle.fuelLevel < fuelPercent) {
      return {
        success: false,
        error: `Not enough fuel to reach pickup. Need ${fuelPercent.toFixed(1)}% but only have ${state.vehicle.fuelLevel.toFixed(1)}%.`,
      };
    }

    // Consume fuel and update mileage
    state.vehicle.fuelLevel -= fuelPercent;
    state.vehicle.milesSinceService += distanceToPickup;

    // Move to pickup zone
    state.currentZone = pickupZone;

    // Consume time
    state.minutesUsedThisHour += totalMinutes;

    // Update ride status
    state.currentRide.status = "in_progress";
    state.currentRide.startedAt = new Date();

    // Check if hour should advance
    if (state.minutesUsedThisHour >= MINUTES_PER_HOUR) {
      state.waitingForNextHour = true;
    }

    const greeting = state.currentRide.request.passenger.talkative
      ? `${state.currentRide.request.passenger.name}: "Hi! Thanks for picking me up. How's your day going?"`
      : `${state.currentRide.request.passenger.name} nods in acknowledgment.`;

    return {
      success: true,
      passenger: state.currentRide.request.passenger.name,
      pickupZone: ZONE_NAMES[pickupZone],
      destination: ZONE_NAMES[state.currentRide.request.dropoffZone],
      travelToPickup:
        distanceToPickup > 0
          ? `${distanceToPickup} miles`
          : "Already at pickup",
      timeUsed: `${totalMinutes} minutes`,
      fuelUsed: `${fuelPercent.toFixed(1)}%`,
      minutesUsedThisHour: state.minutesUsedThisHour,
      hourAdvancing: state.waitingForNextHour,
      message: `Picked up ${state.currentRide.request.passenger.name}. Heading to ${ZONE_NAMES[state.currentRide.request.dropoffZone]}.`,
      passengerGreeting: greeting,
    };
  },
});

/** Complete the current ride - travels to dropoff, drops off passenger */
const completeRideTool = tool({
  description:
    "Complete the ride. This travels to the dropoff zone (consumes time and fuel), then drops off the passenger and collects fare.",
  inputSchema: z.object({}),
  execute: (_, { experimental_context }) => {
    const state = experimental_context as RideshareState;

    if (!state.currentRide) {
      return {
        success: false,
        error: "No active ride to complete.",
      };
    }

    if (state.currentRide.status !== "in_progress") {
      return {
        success: false,
        error: `Cannot complete ride. Current status: ${state.currentRide.status}. Use startRide first.`,
      };
    }

    const ride = state.currentRide;
    const request = ride.request;
    const passenger = request.passenger;
    const dropoffZone = request.dropoffZone;

    // Get fatigue level for penalties
    const fatigueLevel = getFatigueLevel(state.energy.level);
    const travelMultiplier = FATIGUE_TRAVEL_MULTIPLIER[fatigueLevel];
    const tipModifier = FATIGUE_TIP_MODIFIER[fatigueLevel];
    const ratingModifier = FATIGUE_RATING_MODIFIER[fatigueLevel];

    // Calculate distance and time for the ride (with fatigue penalty)
    const rideDistance = ride.actualDistance;
    const baseRideMinutes =
      Math.ceil(rideDistance * MINUTES_PER_MILE_CITY) + DROPOFF_MINUTES;
    const rideMinutes = Math.ceil(baseRideMinutes * travelMultiplier);

    // Calculate fuel for the ride
    const fuelUsed = rideDistance / MPG_CITY;
    const fuelPercent = (fuelUsed / state.vehicle.fuelCapacity) * 100;

    if (state.vehicle.fuelLevel < fuelPercent) {
      return {
        success: false,
        error: `Not enough fuel to complete ride. Need ${fuelPercent.toFixed(1)}% but only have ${state.vehicle.fuelLevel.toFixed(1)}%. Consider cancelling.`,
      };
    }

    // Consume fuel and update mileage
    state.vehicle.fuelLevel -= fuelPercent;
    state.vehicle.milesSinceService += rideDistance;

    // Move to dropoff zone
    state.currentZone = dropoffZone;

    // Consume time
    state.minutesUsedThisHour += rideMinutes;

    // Drain energy for completing ride
    state.energy.level = Math.max(
      0,
      state.energy.level - ENERGY_DRAIN_PER_RIDE
    );
    state.energy.fatigueLevel = getFatigueLevel(state.energy.level);

    // Calculate earnings
    const grossFare = Math.max(
      MIN_FARE,
      BASE_FARE +
        rideDistance * PER_MILE_RATE * request.surgeMultiplier +
        ride.actualDuration * PER_MINUTE_RATE
    );
    const platformFee = grossFare * PLATFORM_CUT[state.profile.tier];
    const netFare = grossFare - platformFee;

    // Calculate tip (with fatigue modifier)
    const tipRange = TIP_PERCENTAGES[passenger.tipTendency];
    const baseTipPercent =
      tipRange.min + Math.random() * (tipRange.max - tipRange.min);
    const hasConversation = ride.messages.length > 0;
    const conversationBonus = hasConversation ? 0.05 : 0;
    const finalTipPercent = Math.max(
      0,
      baseTipPercent + conversationBonus + tipModifier
    );
    const tipAmount = grossFare * finalTipPercent;

    // Calculate rating (with fatigue modifier)
    const ratingBase = 4.5 + ratingModifier;
    const ratingVariance = (Math.random() - 0.5) * 0.6;
    const ratingGiven = Math.max(1, Math.min(5, ratingBase + ratingVariance));

    // Award earnings
    state.balance += netFare;
    state.pendingTips += tipAmount;

    // Record transactions
    const fareTransaction: Transaction = {
      id: generateId(),
      type: "ride_earnings",
      amount: netFare,
      description: `Ride from ${ZONE_NAMES[request.pickupZone]} to ${ZONE_NAMES[dropoffZone]}`,
      timestamp: new Date(),
      hour: state.hour,
      day: state.day,
      relatedRideId: ride.id,
    };
    state.transactions.push(fareTransaction);

    if (tipAmount > 0) {
      const tipTransaction: Transaction = {
        id: generateId(),
        type: "tip",
        amount: tipAmount,
        description: `Tip from ${passenger.name}`,
        timestamp: new Date(),
        hour: state.hour,
        day: state.day,
        relatedRideId: ride.id,
      };
      state.transactions.push(tipTransaction);
    }

    // Record completed ride
    const completedRide: CompletedRide = {
      id: ride.id,
      pickupZone: request.pickupZone,
      dropoffZone,
      distance: rideDistance,
      duration: ride.actualDuration,
      baseFare: BASE_FARE,
      surgeFare: grossFare - BASE_FARE,
      tipAmount,
      platformFee,
      netEarnings: netFare + tipAmount,
      completedAt: new Date(),
      hour: state.hour,
      day: state.day,
      ratingReceived: ratingGiven,
      passengerMood: passenger.mood,
    };
    state.completedRides.push(completedRide);

    // Update driver stats
    state.profile.totalRides += 1;
    state.profile.rating = state.profile.rating * 0.95 + ratingGiven * 0.05;

    state.stats.ridesToday += 1;
    state.stats.earningsToday += netFare + tipAmount;
    state.stats.ridesThisWeek += 1;
    state.stats.earningsThisWeek += netFare + tipAmount;

    // Clear ride and go back online
    state.currentRide = null;
    state.shiftStatus = "online";

    // Check if hour should advance
    if (state.minutesUsedThisHour >= MINUTES_PER_HOUR) {
      state.waitingForNextHour = true;
    }

    return {
      success: true,
      dropoffZone: ZONE_NAMES[dropoffZone],
      rideDistance: `${rideDistance.toFixed(1)} miles`,
      timeUsed: `${rideMinutes} minutes`,
      fuelUsed: `${fuelPercent.toFixed(1)}%`,
      grossFare: grossFare.toFixed(2),
      platformFee: platformFee.toFixed(2),
      netFare: netFare.toFixed(2),
      tip: tipAmount.toFixed(2),
      totalEarnings: (netFare + tipAmount).toFixed(2),
      ratingReceived: ratingGiven.toFixed(1),
      newDriverRating: state.profile.rating.toFixed(2),
      minutesUsedThisHour: state.minutesUsedThisHour,
      hourAdvancing: state.waitingForNextHour,
      message: `Ride completed! Earned $${(netFare + tipAmount).toFixed(2)} (fare: $${netFare.toFixed(2)}, tip: $${tipAmount.toFixed(2)})`,
    };
  },
});

export {
  viewPendingRequestsTool,
  acceptRideTool,
  declineRideTool,
  startRideTool,
  completeRideTool,
};
