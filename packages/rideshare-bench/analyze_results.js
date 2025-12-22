import fs from "fs";

const data = JSON.parse(
  fs.readFileSync(
    "./src/results/2025-12-13T18-06-35-817Z_anthropic_claude-sonnet-4.5.json",
    "utf8"
  )
);

const hourlyLog = data.hourlyLog;

console.log("=== BASIC STATS ===");
console.log(`Total Hours: ${data.hoursCompleted}`);
console.log(`Total Rides: ${data.totalRides}`);
console.log(`Final Balance: $${data.finalBalance.toFixed(2)}`);
console.log(`Net Earnings: $${(data.finalBalance - 100).toFixed(2)}`);
console.log(`Final Rating: ${data.finalRating.toFixed(2)}`);
console.log(`Initial Rating: ${hourlyLog[0].rating}`);
console.log(
  `Rating Drop: ${(hourlyLog[0].rating - data.finalRating).toFixed(2)}`
);

console.log("\n=== EARNING EFFICIENCY ===");
const earningsByHour = {};
const earningsByZone = {};
const ridesByZone = {};

for (let i = 1; i < hourlyLog.length; i++) {
  const prev = hourlyLog[i - 1];
  const curr = hourlyLog[i];
  const earnings = curr.balance - prev.balance;
  const hour = curr.hour;
  const zone = curr.zone;

  if (!earningsByHour[hour]) earningsByHour[hour] = { total: 0, count: 0 };
  earningsByHour[hour].total += earnings;
  earningsByHour[hour].count++;

  if (!earningsByZone[zone]) {
    earningsByZone[zone] = { total: 0, count: 0 };
    ridesByZone[zone] = 0;
  }
  earningsByZone[zone].total += earnings;
  earningsByZone[zone].count++;

  if (curr.ridesCompleted > prev.ridesCompleted) {
    ridesByZone[zone]++;
  }
}

console.log("\nTop Earning Hours:");
const sortedHours = Object.entries(earningsByHour)
  .map(([hour, data]) => ({ hour, avg: data.total / data.count }))
  .sort((a, b) => b.avg - a.avg)
  .slice(0, 5);
sortedHours.forEach((h) =>
  console.log(`  Hour ${h.hour}: $${h.avg.toFixed(2)} avg`)
);

console.log("\nEarnings by Zone:");
Object.entries(earningsByZone)
  .sort((a, b) => b[1].total - a[1].total)
  .forEach(([zone, data]) => {
    console.log(
      `  ${zone}: $${data.total.toFixed(2)} total, $${(data.total / data.count).toFixed(2)} avg/hr, ${ridesByZone[zone]} rides`
    );
  });

console.log("\n=== RATING ANALYSIS ===");
const ratingDrops = [];
for (let i = 1; i < hourlyLog.length; i++) {
  const prev = hourlyLog[i - 1];
  const curr = hourlyLog[i];
  const drop = prev.rating - curr.rating;
  if (drop > 0.01) {
    ratingDrops.push({
      day: curr.day,
      hour: curr.hour,
      drop,
      zone: curr.zone,
      newRating: curr.rating,
    });
  }
}

console.log("Biggest Rating Drops:");
ratingDrops
  .sort((a, b) => b.drop - a.drop)
  .slice(0, 10)
  .forEach((r) => {
    console.log(
      `  Day ${r.day} Hour ${r.hour}: -${r.drop.toFixed(4)} to ${r.newRating.toFixed(2)} in ${r.zone}`
    );
  });

console.log("\n=== FUEL MANAGEMENT ===");
let refuelCount = 0;
const lowFuelHours = [];
for (let i = 1; i < hourlyLog.length; i++) {
  const prev = hourlyLog[i - 1];
  const curr = hourlyLog[i];
  if (curr.fuelLevel > prev.fuelLevel + 10) {
    refuelCount++;
    console.log(
      `Refuel at Day ${curr.day} Hour ${curr.hour}: ${prev.fuelLevel.toFixed(1)}% -> ${curr.fuelLevel.toFixed(1)}%`
    );
  }
  if (curr.fuelLevel < 20) {
    lowFuelHours.push({
      day: curr.day,
      hour: curr.hour,
      fuel: curr.fuelLevel,
      zone: curr.zone,
    });
  }
}

console.log(`\nTotal Refuels: ${refuelCount}`);
console.log("Low Fuel Warnings (<20%):");
lowFuelHours.forEach((h) => {
  console.log(
    `  Day ${h.day} Hour ${h.hour}: ${h.fuel.toFixed(1)}% in ${h.zone}`
  );
});

console.log("\n=== IDLE HOURS ===");
let idleCount = 0;
const idleHours = [];
for (let i = 1; i < hourlyLog.length; i++) {
  const prev = hourlyLog[i - 1];
  const curr = hourlyLog[i];
  if (
    Math.abs(curr.balance - prev.balance) < 0.01 &&
    curr.ridesCompleted === prev.ridesCompleted
  ) {
    idleCount++;
    idleHours.push({
      day: curr.day,
      hour: curr.hour,
      zone: curr.zone,
      fuel: curr.fuelLevel,
    });
  }
}

console.log(
  `Total Idle Hours: ${idleCount} (${((idleCount / hourlyLog.length) * 100).toFixed(1)}%)`
);
console.log("Sample Idle Periods:");
idleHours.slice(0, 20).forEach((h) => {
  console.log(
    `  Day ${h.day} Hour ${h.hour}: ${h.zone}, Fuel: ${h.fuel.toFixed(1)}%`
  );
});

console.log("\n=== ZONE STRATEGY ===");
const zoneChanges = [];
let currentZone = hourlyLog[0].zone;
let zoneStartHour = 0;
for (let i = 1; i < hourlyLog.length; i++) {
  if (hourlyLog[i].zone !== currentZone) {
    zoneChanges.push({
      from: currentZone,
      to: hourlyLog[i].zone,
      duration: i - zoneStartHour,
      day: hourlyLog[i].day,
      hour: hourlyLog[i].hour,
    });
    currentZone = hourlyLog[i].zone;
    zoneStartHour = i;
  }
}

console.log(`Total Zone Changes: ${zoneChanges.length}`);
console.log("Zone Change Pattern (first 20):");
zoneChanges.slice(0, 20).forEach((z) => {
  console.log(
    `  Day ${z.day} Hour ${z.hour}: ${z.from} -> ${z.to} (stayed ${z.duration}h)`
  );
});

console.log("\n=== DAILY SUMMARY ===");
const dailyStats = {};
hourlyLog.forEach((h) => {
  if (!dailyStats[h.day]) {
    dailyStats[h.day] = {
      startBalance: h.balance,
      endBalance: h.balance,
      startRating: h.rating,
      endRating: h.rating,
      rides: 0,
      hours: 0,
    };
  }
  dailyStats[h.day].endBalance = h.balance;
  dailyStats[h.day].endRating = h.rating;
  dailyStats[h.day].hours++;
  if (h.ridesCompleted > dailyStats[h.day].rides) {
    dailyStats[h.day].rides = h.ridesCompleted;
  }
});

Object.entries(dailyStats).forEach(([day, stats]) => {
  const earnings = stats.endBalance - stats.startBalance;
  const ratingChange = stats.endRating - stats.startRating;
  console.log(
    `Day ${day}: +$${earnings.toFixed(2)}, Rating ${ratingChange >= 0 ? "+" : ""}${ratingChange.toFixed(3)}, ${stats.hours}h`
  );
});
