#!/usr/bin/env node
/**
 * Rideshare-Bench Analyzer
 *
 * CLI tool to analyze benchmark results and display statistics.
 *
 * Usage:
 *   bun run analyze <result.json>
 */

import { readFileSync } from "node:fs";
import type { BenchmarkResult, HourLog } from "./benchmark.js";

type SavedResult = BenchmarkResult & {
  model: string;
  startedAt: string;
  endedAt: string;
  elapsedSeconds: number;
  interrupted: boolean;
};

type DayStats = {
  day: number;
  earnings: number;
  rides: number;
  avgRating: number;
  zones: string[];
};

type ZoneStats = {
  zone: string;
  hours: number;
  percentage: number;
};

const DOUBLE_LINE = "═".repeat(60);
const SINGLE_LINE = "─".repeat(58);

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const formatMoney = (amount: number): string =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const padLeft = (str: string, len: number): string =>
  str.length >= len ? str : " ".repeat(len - str.length) + str;

const padRight = (str: string, len: number): string =>
  str.length >= len ? str : str + " ".repeat(len - str.length);

const printHeader = (result: SavedResult): void => {
  const date = new Date(result.startedAt).toLocaleString();
  const status = result.interrupted
    ? `Interrupted (Day ${Math.ceil(result.hoursCompleted / 24)}, Hour ${result.hoursCompleted})`
    : result.terminationReason === "completed"
      ? "Completed"
      : `Terminated: ${result.terminationReason}`;

  console.log(`\n${DOUBLE_LINE}`);
  console.log("RIDESHARE-BENCH ANALYSIS");
  console.log(DOUBLE_LINE);
  console.log(`Model:    ${result.model}`);
  console.log(`Run Date: ${date}`);
  console.log(`Duration: ${formatDuration(result.elapsedSeconds)}`);
  console.log(`Status:   ${status}`);
};

const printSummary = (result: SavedResult): void => {
  const earningsPerHour =
    result.hoursCompleted > 0
      ? (result.finalBalance - 100) / result.hoursCompleted
      : 0;
  const days = result.hoursCompleted / 24;
  const ridesPerDay = days > 0 ? result.totalRides / days : 0;

  console.log(`\n${SINGLE_LINE}`);
  console.log("SUMMARY");
  console.log(SINGLE_LINE);
  console.log(`Final Score:     ${formatMoney(result.finalScore)}`);
  console.log(`Final Balance:   ${formatMoney(result.finalBalance)}`);
  console.log(`Total Rides:     ${result.totalRides}`);
  console.log(`Final Rating:    ${result.finalRating.toFixed(2)} ⭐`);
  console.log(`Earnings/Hour:   ${formatMoney(earningsPerHour)}`);
  console.log(`Rides/Day:       ${ridesPerDay.toFixed(1)}`);
};

const calculateDailyStats = (hourlyLog: HourLog[]): DayStats[] => {
  const dayMap = new Map<
    number,
    { earnings: number; rides: number; ratings: number[]; zones: Set<string> }
  >();

  let prevBalance = 100;
  let prevRides = 0;

  for (const log of hourlyLog) {
    const day = log.day;
    if (!dayMap.has(day)) {
      dayMap.set(day, { earnings: 0, rides: 0, ratings: [], zones: new Set() });
    }
    const stats = dayMap.get(day);
    if (!stats) continue;

    const earnedThisHour = log.balance - prevBalance;
    const ridesThisHour = log.ridesCompleted - prevRides;

    stats.earnings += earnedThisHour;
    stats.rides += ridesThisHour;
    stats.ratings.push(log.rating);
    stats.zones.add(log.zone);

    prevBalance = log.balance;
    prevRides = log.ridesCompleted;
  }

  return Array.from(dayMap.entries())
    .map(([day, stats]) => ({
      day,
      earnings: stats.earnings,
      rides: stats.rides,
      avgRating:
        stats.ratings.length > 0
          ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length
          : 0,
      zones: Array.from(stats.zones),
    }))
    .sort((a, b) => a.day - b.day);
};

const printDailyBreakdown = (hourlyLog: HourLog[]): void => {
  const dailyStats = calculateDailyStats(hourlyLog);
  if (dailyStats.length === 0) return;

  console.log(`\n${SINGLE_LINE}`);
  console.log("DAILY BREAKDOWN");
  console.log(SINGLE_LINE);
  console.log("Day │ Earnings │ Rides │ Rating │ Top Zones");
  console.log("────┼──────────┼───────┼────────┼─────────────────────");

  for (const day of dailyStats) {
    const dayStr = padLeft(day.day.toString(), 3);
    const earningsStr = padLeft(formatMoney(day.earnings), 8);
    const ridesStr = padLeft(day.rides.toString(), 5);
    const ratingStr = padLeft(day.avgRating.toFixed(2), 6);
    const zonesStr = day.zones.slice(0, 2).join(", ");
    console.log(
      `${dayStr} │${earningsStr} │${ridesStr} │${ratingStr} │ ${zonesStr}`
    );
  }
};

const calculateZoneStats = (hourlyLog: HourLog[]): ZoneStats[] => {
  const zoneHours = new Map<string, number>();

  for (const log of hourlyLog) {
    zoneHours.set(log.zone, (zoneHours.get(log.zone) ?? 0) + 1);
  }

  const total = hourlyLog.length;
  return Array.from(zoneHours.entries())
    .map(([zone, hours]) => ({
      zone,
      hours,
      percentage: total > 0 ? (hours / total) * 100 : 0,
    }))
    .sort((a, b) => b.hours - a.hours);
};

const printZoneAnalysis = (hourlyLog: HourLog[]): void => {
  const zoneStats = calculateZoneStats(hourlyLog);
  if (zoneStats.length === 0) return;

  console.log(`\n${SINGLE_LINE}`);
  console.log("ZONE ANALYSIS");
  console.log(SINGLE_LINE);
  console.log("Zone              │ Hours │   %");
  console.log("──────────────────┼───────┼─────");

  for (const zone of zoneStats) {
    const zoneStr = padRight(zone.zone, 17);
    const hoursStr = padLeft(zone.hours.toString(), 5);
    const pctStr = padLeft(zone.percentage.toFixed(0), 4);
    console.log(`${zoneStr} │${hoursStr} │${pctStr}%`);
  }
};

const parseToolCalls = (transcript: string[]): Map<string, number> => {
  const toolCounts = new Map<string, number>();
  const toolRegex = /🔧 \[Tool: (\w+)\]/;

  for (const line of transcript) {
    const match = toolRegex.exec(line);
    if (match?.[1]) {
      toolCounts.set(match[1], (toolCounts.get(match[1]) ?? 0) + 1);
    }
  }

  return toolCounts;
};

const printToolUsage = (transcript: string[]): void => {
  const toolCounts = parseToolCalls(transcript);
  if (toolCounts.size === 0) return;

  const total = Array.from(toolCounts.values()).reduce((a, b) => a + b, 0);
  const sorted = Array.from(toolCounts.entries()).sort((a, b) => b[1] - a[1]);

  console.log(`\n${SINGLE_LINE}`);
  console.log("TOOL USAGE");
  console.log(SINGLE_LINE);
  console.log("Tool               │ Count │   %");
  console.log("───────────────────┼───────┼─────");

  for (const [tool, count] of sorted.slice(0, 12)) {
    const toolStr = padRight(tool, 18);
    const countStr = padLeft(count.toString(), 5);
    const pctStr = padLeft(((count / total) * 100).toFixed(0), 4);
    console.log(`${toolStr} │${countStr} │${pctStr}%`);
  }

  console.log("───────────────────┼───────┼─────");
  console.log(
    `${padRight("Total", 18)} │${padLeft(total.toString(), 5)} │ 100%`
  );
};

const renderAsciiChart = (
  data: number[],
  height: number,
  width: number,
  yLabel: (v: number) => string
): string[] => {
  if (data.length === 0) return [];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const lines: string[] = [];
  const labelWidth = 6;

  for (let row = height - 1; row >= 0; row--) {
    const threshold = min + (range * (row + 0.5)) / height;
    let line = "";

    if (row === height - 1) {
      line = padLeft(yLabel(max), labelWidth) + " ┤";
    } else if (row === 0) {
      line = padLeft(yLabel(min), labelWidth) + " ┤";
    } else if (row === Math.floor(height / 2)) {
      line = padLeft(yLabel(min + range / 2), labelWidth) + " ┤";
    } else {
      line = " ".repeat(labelWidth) + " │";
    }

    const step = Math.max(1, Math.floor(data.length / width));
    for (let i = 0; i < width && i * step < data.length; i++) {
      const idx = i * step;
      const val = data[idx] ?? min;
      const nextVal = data[Math.min(idx + step, data.length - 1)] ?? val;

      if (val >= threshold && nextVal >= threshold) {
        line += "─";
      } else if (val >= threshold) {
        line += "╲";
      } else if (nextVal >= threshold) {
        line += "╱";
      } else {
        line += " ";
      }
    }

    lines.push(line);
  }

  lines.push(" ".repeat(labelWidth) + " └" + "─".repeat(width));

  return lines;
};

const printRatingTrend = (hourlyLog: HourLog[]): void => {
  if (hourlyLog.length === 0) return;

  const dailyRatings = calculateDailyStats(hourlyLog).map((d) => d.avgRating);
  if (dailyRatings.length < 2) return;

  console.log(`\n${SINGLE_LINE}`);
  console.log("RATING TREND");
  console.log(SINGLE_LINE);

  const chart = renderAsciiChart(dailyRatings, 5, 40, (v) => v.toFixed(2));
  for (const line of chart) console.log(line);

  const dayLabels =
    "       Day " +
    dailyRatings
      .map((_, i) => (i % 3 === 0 ? (i + 1).toString().padStart(2) : "  "))
      .join(" ")
      .slice(0, 40);
  console.log(dayLabels);
};

const printEarningsTrend = (hourlyLog: HourLog[]): void => {
  if (hourlyLog.length === 0) return;

  const balances = hourlyLog.map((h) => h.balance);
  if (balances.length < 2) return;

  console.log(`\n${SINGLE_LINE}`);
  console.log("EARNINGS OVER TIME");
  console.log(SINGLE_LINE);

  const chart = renderAsciiChart(balances, 5, 40, (v) =>
    formatMoney(v).slice(0, 6)
  );
  for (const line of chart) console.log(line);

  const totalHours = hourlyLog.length;
  const step = Math.floor(totalHours / 5);
  console.log(
    "       Hour " +
      Array.from({ length: 6 }, (_, i) =>
        padLeft((i * step).toString(), 5)
      ).join(" ")
  );
};

const printModelThinking = (transcript: string[]): void => {
  const thinkingBlocks: string[] = [];
  let capturing = false;
  let current = "";

  for (const line of transcript) {
    if (line.includes("💭 [Model says]:")) {
      capturing = true;
      current = "";
      continue;
    }
    if (capturing) {
      if (
        line.startsWith("🔧") ||
        line.startsWith("═") ||
        line.startsWith("─")
      ) {
        if (current.trim()) thinkingBlocks.push(current.trim());
        capturing = false;
      } else {
        current += line + "\n";
      }
    }
  }

  if (thinkingBlocks.length === 0) return;

  console.log(`\n${SINGLE_LINE}`);
  console.log("AGENT DECISIONS (Sample)");
  console.log(SINGLE_LINE);

  const samples = [
    thinkingBlocks[0],
    thinkingBlocks[Math.floor(thinkingBlocks.length / 2)],
    thinkingBlocks[thinkingBlocks.length - 1],
  ].filter(Boolean);

  for (const [i, block] of samples.entries()) {
    const truncated =
      block && block.length > 200 ? `${block.slice(0, 200)}...` : block;
    console.log(`\n[${i === 0 ? "Early" : i === 1 ? "Mid" : "Late"}]`);
    console.log(truncated);
  }
};

const analyze = (filepath: string): void => {
  const content = readFileSync(filepath, "utf-8");
  const result = JSON.parse(content) as SavedResult;

  printHeader(result);
  printSummary(result);
  printDailyBreakdown(result.hourlyLog);
  printZoneAnalysis(result.hourlyLog);
  printToolUsage(result.transcript);
  printRatingTrend(result.hourlyLog);
  printEarningsTrend(result.hourlyLog);
  printModelThinking(result.transcript);

  console.log(`\n${DOUBLE_LINE}\n`);
};

const main = (): void => {
  const filepath = process.argv[2];

  if (!filepath) {
    console.error("Usage: bun run analyze <result.json>");
    process.exit(1);
  }

  try {
    analyze(filepath);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

main();
