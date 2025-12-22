/**
 * Rideshare-Bench State Types
 *
 * Extends BaseState with rideshare driver simulation fields.
 */

import type { BaseState } from "@quaver/core/types/state";

/** Metro City zones */
type ZoneId =
  | "downtown"
  | "airport"
  | "suburbs"
  | "university"
  | "nightlife"
  | "business_district"
  | "residential";

/** Days of week (Sun=0 to Sat=6) */
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Driver tier levels */
type DriverTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

/** Vehicle condition states */
type VehicleCondition = "excellent" | "good" | "fair" | "poor" | "critical";

/** Weather conditions */
type WeatherCondition = "clear" | "rain" | "heavy_rain" | "fog";

/** Shift status */
type ShiftStatus = "offline" | "online" | "on_ride";

/** Ride request status */
type RideStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

/** Passenger mood states */
type PassengerMood = "cheerful" | "neutral" | "irritated" | "intoxicated";

/** Tip tendency */
type TipTendency = "generous" | "standard" | "stingy";

/** Passenger gender (visible for bias testing) */
type Gender = "male" | "female" | "non_binary";

/** Passenger ethnicity (visible for bias testing) */
type Ethnicity =
  | "white"
  | "black"
  | "hispanic"
  | "asian"
  | "middle_eastern"
  | "mixed"
  | "other";

/** Transaction types */
type TransactionType =
  | "ride_earnings"
  | "tip"
  | "fuel_cost"
  | "maintenance_cost"
  | "platform_fee";

/** Event types for scoring */
type EventType = "sports" | "concert" | "conference" | "festival";

/** Financial transaction record */
type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: Date;
  hour: number;
  day: number;
  relatedRideId?: string;
};

/** Passenger profile */
type PassengerProfile = {
  id: string;
  name: string;
  rating: number;
  rideCount: number;

  // Demographics (VISIBLE to driver - for bias testing)
  age: number;
  gender: Gender;
  ethnicity: Ethnicity;
  culture: string;
  languages: string[];

  // Behavioral (visible)
  mood: PassengerMood;
  talkative: boolean;
  tipTendency: TipTendency;
  isIntoxicated: boolean;

  // Additional context
  occupation?: string;
  interests?: string[];
  hasSpecialNeeds?: string[];

  // Hidden attribute (not shown to driver)
  complainProbability: number;
};

/** Ride request from platform */
type RideRequest = {
  id: string;
  pickupZone: ZoneId;
  dropoffZone: ZoneId;
  estimatedDistance: number;
  estimatedDuration: number;
  surgeMultiplier: number;
  baseFare: number;
  requestedAt: Date;
  expiresAt: Date;
  passenger: PassengerProfile;
};

/** Active ride in progress */
type ActiveRide = {
  id: string;
  request: RideRequest;
  status: RideStatus;
  acceptedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  messages: ConversationMessage[];
  actualDistance: number;
  actualDuration: number;
  tipAmount: number;
  ratingGiven: number | null;
};

/** Completed ride record */
type CompletedRide = {
  id: string;
  pickupZone: ZoneId;
  dropoffZone: ZoneId;
  distance: number;
  duration: number;
  baseFare: number;
  surgeFare: number;
  tipAmount: number;
  platformFee: number;
  netEarnings: number;
  completedAt: Date;
  hour: number;
  day: number;
  ratingReceived: number | null;
  passengerMood: PassengerMood;
};

/** Conversation message during ride */
type ConversationMessage = {
  id: string;
  from: "driver" | "passenger";
  content: string;
  timestamp: Date;
};

/** Vehicle state */
type Vehicle = {
  fuelLevel: number;
  fuelCapacity: number;
  mpgCity: number;
  mpgHighway: number;
  condition: VehicleCondition;
  conditionScore: number;
  milesSinceService: number;
  nextServiceDue: number;
};

/** Driver profile and stats */
type DriverProfile = {
  rating: number;
  totalRides: number;
  acceptanceRate: number;
  cancellationRate: number;
  tier: DriverTier;
  tierProgress: number;
};

/** Daily stats tracking */
type DriverStats = {
  ridesToday: number;
  earningsToday: number;
  hoursOnlineToday: number;
  ridesThisWeek: number;
  earningsThisWeek: number;
};

/** Fatigue level thresholds */
type FatigueLevel = "rested" | "normal" | "tired" | "exhausted" | "dangerous";

/** Driver mood derived from fatigue and events */
type DriverMood = "excellent" | "good" | "neutral" | "irritated" | "exhausted";

/** Driver energy and fatigue tracking */
type DriverEnergy = {
  level: number; // 0-100 (100 = fully rested)
  hoursWorkedToday: number; // Resets at midnight
  hoursWorkedThisShift: number; // Resets when offline 4+ hours
  lastRestHour: number; // Last hour when offline
  fatigueLevel: FatigueLevel;
  mood: DriverMood;
};

/** City event affecting demand */
type CityEvent = {
  id: string;
  name: string;
  type: EventType;
  zone: ZoneId;
  startHour: number;
  endHour: number;
  day: number;
  surgeMultiplier: number;
  demandSpike: number;
  announced: boolean;
};

/** Zone information */
type ZoneInfo = {
  id: ZoneId;
  name: string;
  currentDemand: number;
  surgeMultiplier: number;
  activeDrivers: number;
  pendingRequests: number;
  gasPrice: number;
};

/** Main rideshare simulation state */
interface RideshareState extends BaseState {
  // Time
  hour: number;
  day: number;
  dayOfWeek: DayOfWeek;
  waitingForNextHour: boolean;
  minutesUsedThisHour: number;

  // Financial
  balance: number;
  pendingTips: number;
  transactions: Transaction[];

  // Vehicle
  vehicle: Vehicle;
  currentZone: ZoneId;

  // Shift
  shiftStatus: ShiftStatus;
  shiftStartHour: number | null;
  hoursOnlineToday: number;

  // Rides
  currentRide: ActiveRide | null;
  pendingRequests: RideRequest[];
  completedRides: CompletedRide[];
  declinedRequestCount: number;
  cancelledRideCount: number;

  // Driver
  profile: DriverProfile;
  stats: DriverStats;
  energy: DriverEnergy;

  // Platform
  surgeMultipliers: Record<ZoneId, number>;
  zoneInfo: Record<ZoneId, ZoneInfo>;
  cityEvents: CityEvent[];
  weatherCondition: WeatherCondition;
  baseGasPrice: number;
}

export type {
  ZoneId,
  DayOfWeek,
  DriverTier,
  VehicleCondition,
  WeatherCondition,
  ShiftStatus,
  RideStatus,
  PassengerMood,
  TipTendency,
  Gender,
  Ethnicity,
  FatigueLevel,
  DriverMood,
  TransactionType,
  Transaction,
  PassengerProfile,
  RideRequest,
  ActiveRide,
  CompletedRide,
  ConversationMessage,
  Vehicle,
  DriverProfile,
  DriverStats,
  DriverEnergy,
  CityEvent,
  ZoneInfo,
  RideshareState,
};
