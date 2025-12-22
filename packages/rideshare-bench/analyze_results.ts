import { readFileSync } from "node:fs";
import { join } from "node:path";

interface HourlyEntry {
  hour: number;
  day: number;
  zone: string;
  earnings: number;
  rating: number;
  balance: number;
}

interface AnalysisResult {
  hourlyPatterns: Map<
    number,
    { totalEarnings: number; count: number; avgEarnings: number }
  >;
  dayOfWeekPatterns: Map<
    number,
    { totalEarnings: number; count: number; avgEarnings: number }
  >;
  ridesPerHour: Map<number, number>;
  ratingCorrelation: Array<{ hour: number; rating: number; earnings: number }>;
  zoneTransitions: number;
  cumulativeGrowth: Array<{
    hour: number;
    balance: number;
    deltaBalance: number;
  }>;
}

const filePath = join(
  __dirname,
  "src/results/2025-12-13T18-06-35-817Z_anthropic_claude-sonnet-4.5.json"
);
const data = JSON.parse(readFileSync(filePath, "utf-8"));

const hourlyLog: HourlyEntry[] = data.hourlyLog || [];

console.log("=== RIDESHARE BENCHMARK ANALYSIS ===\n");
console.log(`Total hours logged: ${hourlyLog.length}`);
console.log(`Final balance: $${data.finalBalance?.toFixed(2) || "N/A"}`);
console.log(`Final rating: ${data.finalRating?.toFixed(2) || "N/A"}\n`);

// 1. Hourly Patterns
console.log("=== 1. HOURLY PATTERNS (by hour-of-day) ===");
const hourlyPatterns = new Map<
  number,
  { totalEarnings: number; count: number; rides: number }
>();

for (const entry of hourlyLog) {
  const hourOfDay = entry.hour % 24;
  const existing = hourlyPatterns.get(hourOfDay) || {
    totalEarnings: 0,
    count: 0,
    rides: 0,
  };
  hourlyPatterns.set(hourOfDay, {
    totalEarnings: existing.totalEarnings + entry.earnings,
    count: existing.count + 1,
    rides: existing.rides + (entry.earnings > 0 ? 1 : 0),
  });
}

const sortedByEarnings = Array.from(hourlyPatterns.entries())
  .map(([hour, stats]) => ({
    hour,
    avgEarnings: stats.totalEarnings / stats.count,
    totalEarnings: stats.totalEarnings,
    occurrences: stats.count,
    ridesPerOccurrence: stats.rides / stats.count,
  }))
  .sort((a, b) => b.avgEarnings - a.avgEarnings);

console.log("\nTop 5 Most Profitable Hours:");
for (let i = 0; i < Math.min(5, sortedByEarnings.length); i++) {
  const h = sortedByEarnings[i];
  console.log(
    `  Hour ${h.hour.toString().padStart(2, "0")}:00 - Avg: $${h.avgEarnings.toFixed(2)}, Total: $${h.totalEarnings.toFixed(2)}, Occurrences: ${h.occurrences}, Rides/Hour: ${h.ridesPerOccurrence.toFixed(2)}`
  );
}

console.log("\nBottom 5 Least Profitable Hours:");
for (
  let i = Math.max(0, sortedByEarnings.length - 5);
  i < sortedByEarnings.length;
  i++
) {
  const h = sortedByEarnings[i];
  console.log(
    `  Hour ${h.hour.toString().padStart(2, "0")}:00 - Avg: $${h.avgEarnings.toFixed(2)}, Total: $${h.totalEarnings.toFixed(2)}, Occurrences: ${h.occurrences}, Rides/Hour: ${h.ridesPerOccurrence.toFixed(2)}`
  );
}

// 2. Day-of-Week Effect
console.log("\n\n=== 2. DAY-OF-WEEK PATTERNS ===");
const dayPatterns = new Map<
  number,
  { totalEarnings: number; count: number; rides: number }
>();

for (const entry of hourlyLog) {
  const day = entry.day;
  const existing = dayPatterns.get(day) || {
    totalEarnings: 0,
    count: 0,
    rides: 0,
  };
  dayPatterns.set(day, {
    totalEarnings: existing.totalEarnings + entry.earnings,
    count: existing.count + 1,
    rides: existing.rides + (entry.earnings > 0 ? 1 : 0),
  });
}

const dayNames = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const sortedByDay = Array.from(dayPatterns.entries())
  .map(([day, stats]) => ({
    day,
    dayName: dayNames[day] || `Day ${day}`,
    avgEarnings: stats.totalEarnings / stats.count,
    totalEarnings: stats.totalEarnings,
    hours: stats.count,
    totalRides: stats.rides,
    ridesPerHour: stats.rides / stats.count,
  }))
  .sort((a, b) => a.day - b.day);

for (const d of sortedByDay) {
  console.log(
    `${d.dayName.padEnd(10)}: Avg/Hr: $${d.avgEarnings.toFixed(2)}, Total: $${d.totalEarnings.toFixed(2)}, Hours: ${d.hours}, Total Rides: ${d.totalRides}, Rides/Hr: ${d.ridesPerHour.toFixed(2)}`
  );
}

const bestDay = sortedByDay.reduce((a, b) =>
  a.avgEarnings > b.avgEarnings ? a : b
);
const worstDay = sortedByDay.reduce((a, b) =>
  a.avgEarnings < b.avgEarnings ? a : b
);
console.log(
  `\nBest day: ${bestDay.dayName} ($${bestDay.avgEarnings.toFixed(2)}/hr)`
);
console.log(
  `Worst day: ${worstDay.dayName} ($${worstDay.avgEarnings.toFixed(2)}/hr)`
);

// 3. Ride Frequency
console.log("\n\n=== 3. RIDE FREQUENCY ANALYSIS ===");
const ridesPerHour = new Map<number, number>();
let totalRides = 0;

for (const entry of hourlyLog) {
  if (entry.earnings > 0) {
    ridesPerHour.set(entry.hour, (ridesPerHour.get(entry.hour) || 0) + 1);
    totalRides++;
  }
}

const avgRidesPerHour = totalRides / hourlyLog.length;
console.log(`Total rides completed: ${totalRides}`);
console.log(`Average rides per hour: ${avgRidesPerHour.toFixed(2)}`);

const hoursByActivity = hourlyLog
  .map((entry, idx) => ({
    idx,
    hour: entry.hour,
    rides: ridesPerHour.get(entry.hour) || 0,
    earnings: entry.earnings,
  }))
  .sort((a, b) => b.rides - a.rides);

console.log("\nMost Active Hours:");
for (let i = 0; i < Math.min(5, hoursByActivity.length); i++) {
  const h = hoursByActivity[i];
  console.log(
    `  Simulation Hour ${h.hour}: ${h.rides} rides, $${h.earnings.toFixed(2)} earned`
  );
}

console.log("\nLeast Active Hours (with 0 rides):");
const inactiveHours = hoursByActivity.filter((h) => h.rides === 0).slice(-5);
for (const h of inactiveHours) {
  console.log(
    `  Simulation Hour ${h.hour}: ${h.rides} rides, $${h.earnings.toFixed(2)} earned`
  );
}

// 4. Rating vs Earnings Correlation
console.log("\n\n=== 4. RATING vs EARNINGS CORRELATION ===");
const ratingChanges: Array<{
  ratingDelta: number;
  earnings: number;
  hour: number;
}> = [];

for (let i = 1; i < hourlyLog.length; i++) {
  const ratingDelta = hourlyLog[i].rating - hourlyLog[i - 1].rating;
  ratingChanges.push({
    ratingDelta,
    earnings: hourlyLog[i].earnings,
    hour: hourlyLog[i].hour,
  });
}

// Calculate Pearson correlation
const meanRatingDelta =
  ratingChanges.reduce((sum, item) => sum + item.ratingDelta, 0) /
  ratingChanges.length;
const meanEarnings =
  ratingChanges.reduce((sum, item) => sum + item.earnings, 0) /
  ratingChanges.length;

let numerator = 0;
let denomRating = 0;
let denomEarnings = 0;

for (const item of ratingChanges) {
  const ratingDiff = item.ratingDelta - meanRatingDelta;
  const earningsDiff = item.earnings - meanEarnings;
  numerator += ratingDiff * earningsDiff;
  denomRating += ratingDiff * ratingDiff;
  denomEarnings += earningsDiff * earningsDiff;
}

const correlation = numerator / Math.sqrt(denomRating * denomEarnings);
console.log(`Pearson correlation coefficient: ${correlation.toFixed(4)}`);
console.log(
  `Interpretation: ${Math.abs(correlation) > 0.7 ? "Strong" : Math.abs(correlation) > 0.4 ? "Moderate" : "Weak"} ${correlation > 0 ? "positive" : "negative"} correlation`
);

const ratingIncreases = ratingChanges.filter((r) => r.ratingDelta > 0);
const ratingDecreases = ratingChanges.filter((r) => r.ratingDelta < 0);
const ratingStable = ratingChanges.filter((r) => r.ratingDelta === 0);

console.log(
  `\nRating increases: ${ratingIncreases.length} times, avg earnings: $${(ratingIncreases.reduce((s, r) => s + r.earnings, 0) / ratingIncreases.length || 0).toFixed(2)}`
);
console.log(
  `Rating decreases: ${ratingDecreases.length} times, avg earnings: $${(ratingDecreases.reduce((s, r) => s + r.earnings, 0) / ratingDecreases.length || 0).toFixed(2)}`
);
console.log(
  `Rating stable: ${ratingStable.length} times, avg earnings: $${(ratingStable.reduce((s, r) => s + r.earnings, 0) / ratingStable.length || 0).toFixed(2)}`
);

// 5. Zone Transitions
console.log("\n\n=== 5. ZONE TRANSITION ANALYSIS ===");
let zoneTransitions = 0;
const zoneStats = new Map<
  string,
  { hours: number; earnings: number; transitions: number }
>();

for (let i = 0; i < hourlyLog.length; i++) {
  const entry = hourlyLog[i];
  const stats = zoneStats.get(entry.zone) || {
    hours: 0,
    earnings: 0,
    transitions: 0,
  };
  stats.hours++;
  stats.earnings += entry.earnings;
  zoneStats.set(entry.zone, stats);

  if (i > 0 && hourlyLog[i].zone !== hourlyLog[i - 1].zone) {
    zoneTransitions++;
    stats.transitions++;
  }
}

console.log(`Total zone transitions: ${zoneTransitions}`);
console.log(
  `Transition rate: ${((zoneTransitions / hourlyLog.length) * 100).toFixed(2)}% of hours`
);

console.log("\nZone Performance:");
const sortedZones = Array.from(zoneStats.entries())
  .map(([zone, stats]) => ({
    zone,
    hours: stats.hours,
    avgEarnings: stats.earnings / stats.hours,
    totalEarnings: stats.earnings,
    transitions: stats.transitions,
  }))
  .sort((a, b) => b.avgEarnings - a.avgEarnings);

for (const z of sortedZones) {
  console.log(
    `  ${z.zone.padEnd(10)}: ${z.hours.toString().padStart(4)} hours, Avg: $${z.avgEarnings.toFixed(2)}/hr, Total: $${z.totalEarnings.toFixed(2)}, Entered ${z.transitions} times`
  );
}

// Analyze mobility strategy
const transitionEarnings: number[] = [];
const stableEarnings: number[] = [];

for (let i = 1; i < hourlyLog.length; i++) {
  if (hourlyLog[i].zone !== hourlyLog[i - 1].zone) {
    transitionEarnings.push(hourlyLog[i].earnings);
  } else {
    stableEarnings.push(hourlyLog[i].earnings);
  }
}

const avgTransitionEarnings =
  transitionEarnings.reduce((a, b) => a + b, 0) / transitionEarnings.length ||
  0;
const avgStableEarnings =
  stableEarnings.reduce((a, b) => a + b, 0) / stableEarnings.length || 0;

console.log("\nMobility Strategy Analysis:");
console.log(
  `  Hours after zone change: ${transitionEarnings.length}, avg earnings: $${avgTransitionEarnings.toFixed(2)}`
);
console.log(
  `  Hours staying in zone: ${stableEarnings.length}, avg earnings: $${avgStableEarnings.toFixed(2)}`
);
console.log(
  `  Verdict: ${avgTransitionEarnings > avgStableEarnings ? "Zone changes were BENEFICIAL" : "Staying put was BETTER"} (${(((avgTransitionEarnings - avgStableEarnings) / avgStableEarnings) * 100).toFixed(1)}% difference)`
);

// 6. Cumulative Analysis
console.log("\n\n=== 6. CUMULATIVE BALANCE GROWTH ===");
const growthRates: Array<{
  hour: number;
  balance: number;
  deltaBalance: number;
  growthRate: number;
}> = [];

for (let i = 1; i < hourlyLog.length; i++) {
  const deltaBalance = hourlyLog[i].balance - hourlyLog[i - 1].balance;
  const growthRate =
    hourlyLog[i - 1].balance > 0
      ? (deltaBalance / hourlyLog[i - 1].balance) * 100
      : 0;
  growthRates.push({
    hour: hourlyLog[i].hour,
    balance: hourlyLog[i].balance,
    deltaBalance,
    growthRate,
  });
}

// Find periods of acceleration/deceleration
const windowSize = 10;
console.log(`\nBalance growth rate over ${windowSize}-hour windows:`);

for (let i = 0; i < growthRates.length; i += windowSize) {
  const window = growthRates.slice(i, i + windowSize);
  const avgGrowth =
    window.reduce((sum, g) => sum + g.deltaBalance, 0) / window.length;
  const startHour = window[0].hour;
  const endHour = window[window.length - 1].hour;
  const startBalance = hourlyLog[i].balance;
  const endBalance = window[window.length - 1].balance;

  console.log(
    `  Hours ${startHour}-${endHour}: $${startBalance.toFixed(0)} → $${endBalance.toFixed(0)}, Avg growth: $${avgGrowth.toFixed(2)}/hr`
  );
}

// Best and worst periods
const sortedByGrowth = [...growthRates].sort(
  (a, b) => b.deltaBalance - a.deltaBalance
);

console.log("\n=== BEST PERFORMING PERIODS ===");
for (let i = 0; i < Math.min(5, sortedByGrowth.length); i++) {
  const period = sortedByGrowth[i];
  const hourData = hourlyLog.find((h) => h.hour === period.hour);
  console.log(
    `  Hour ${period.hour}: +$${period.deltaBalance.toFixed(2)} (${hourData?.zone || "Unknown"}, ${(period.hour % 24).toString().padStart(2, "0")}:00)`
  );
}

console.log("\n=== WORST PERFORMING PERIODS ===");
for (
  let i = Math.max(0, sortedByGrowth.length - 5);
  i < sortedByGrowth.length;
  i++
) {
  const period = sortedByGrowth[i];
  const hourData = hourlyLog.find((h) => h.hour === period.hour);
  console.log(
    `  Hour ${period.hour}: ${period.deltaBalance >= 0 ? "+" : ""}$${period.deltaBalance.toFixed(2)} (${hourData?.zone || "Unknown"}, ${(period.hour % 24).toString().padStart(2, "0")}:00)`
  );
}

// Summary statistics
console.log("\n\n=== SUMMARY STATISTICS ===");
const totalEarnings = hourlyLog.reduce((sum, h) => sum + h.earnings, 0);
const avgHourlyEarnings = totalEarnings / hourlyLog.length;
const stdDev = Math.sqrt(
  hourlyLog.reduce((sum, h) => sum + (h.earnings - avgHourlyEarnings) ** 2, 0) /
    hourlyLog.length
);

console.log(`Total simulation hours: ${hourlyLog.length}`);
console.log(`Total earnings: $${totalEarnings.toFixed(2)}`);
console.log(
  `Average hourly earnings: $${avgHourlyEarnings.toFixed(2)} (σ = $${stdDev.toFixed(2)})`
);
console.log(`Starting balance: $${hourlyLog[0]?.balance.toFixed(2) || "N/A"}`);
console.log(
  `Final balance: $${hourlyLog[hourlyLog.length - 1]?.balance.toFixed(2) || "N/A"}`
);
console.log(
  `Net profit: $${((hourlyLog[hourlyLog.length - 1]?.balance || 0) - (hourlyLog[0]?.balance || 0)).toFixed(2)}`
);
console.log(`Starting rating: ${hourlyLog[0]?.rating.toFixed(2) || "N/A"}`);
console.log(
  `Final rating: ${hourlyLog[hourlyLog.length - 1]?.rating.toFixed(2) || "N/A"}`
);
console.log(
  `Rating change: ${((hourlyLog[hourlyLog.length - 1]?.rating || 0) - (hourlyLog[0]?.rating || 0)).toFixed(2)}`
);
