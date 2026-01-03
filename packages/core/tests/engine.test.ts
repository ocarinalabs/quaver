/**
 * Engine Unit Tests
 *
 * Tests for simulation step advancement and scoring logic.
 */

import { beforeEach, describe, expect, test } from "bun:test";
import {
  FAILURE_THRESHOLD,
  INITIAL_SCORE,
  STEP_COST,
} from "../src/config/constants";
import { createInitialState } from "../src/config/init";
import type { YourBenchmarkState } from "../src/config/types";
import {
  calculateScore,
  getSimulationSummary,
  isTerminated,
} from "../src/engine/scoring";
import { advanceStep } from "../src/engine/step";

describe("engine", () => {
  let state: YourBenchmarkState;

  beforeEach(() => {
    state = createInitialState();
  });

  describe("createInitialState", () => {
    test("returns state with correct initial values", () => {
      expect(state.step).toBe(1);
      expect(state.score).toBe(INITIAL_SCORE);
      expect(state.failureCount).toBe(0);
      expect(state.waitingForNextStep).toBe(false);
      expect(state.events).toEqual([]);
    });
  });

  describe("advanceStep", () => {
    test("deducts STEP_COST from score", () => {
      const initial = state.score;
      advanceStep(state);
      expect(state.score).toBe(initial - STEP_COST);
    });

    test("increments step counter", () => {
      expect(state.step).toBe(1);
      advanceStep(state);
      expect(state.step).toBe(2);
      advanceStep(state);
      expect(state.step).toBe(3);
    });

    test("resets waitingForNextStep flag", () => {
      state.waitingForNextStep = true;
      advanceStep(state);
      expect(state.waitingForNextStep).toBe(false);
    });

    test("adds event when cost is paid", () => {
      const eventsBefore = state.events.length;
      advanceStep(state);
      expect(state.events.length).toBe(eventsBefore + 1);
      expect(state.events[0].type).toBe("cost");
      expect(state.events[0].delta).toBe(-STEP_COST);
    });

    test("returns step report with correct values", () => {
      const report = advanceStep(state);
      expect(report.step).toBe(2);
      expect(report.cost.paid).toBe(true);
      expect(report.cost.amount).toBe(STEP_COST);
      expect(report.score).toBe(INITIAL_SCORE - STEP_COST);
    });

    test("increments failureCount when score is insufficient", () => {
      state.score = STEP_COST - 1; // Not enough to pay
      expect(state.failureCount).toBe(0);
      advanceStep(state);
      expect(state.failureCount).toBe(1);
    });

    test("resets failureCount to 0 when cost is paid", () => {
      state.failureCount = 5;
      advanceStep(state);
      expect(state.failureCount).toBe(0);
    });
  });

  describe("isTerminated", () => {
    test("returns false for fresh state", () => {
      expect(isTerminated(state)).toBe(false);
    });

    test("returns false when failureCount below threshold", () => {
      state.failureCount = FAILURE_THRESHOLD - 1;
      expect(isTerminated(state)).toBe(false);
    });

    test("returns true when failureCount equals FAILURE_THRESHOLD", () => {
      state.failureCount = FAILURE_THRESHOLD;
      expect(isTerminated(state)).toBe(true);
    });

    test("returns true when failureCount exceeds FAILURE_THRESHOLD", () => {
      state.failureCount = FAILURE_THRESHOLD + 5;
      expect(isTerminated(state)).toBe(true);
    });
  });

  describe("calculateScore", () => {
    test("returns INITIAL_SCORE for fresh state", () => {
      expect(calculateScore(state)).toBe(INITIAL_SCORE);
    });

    test("returns current score after modifications", () => {
      state.score = 250;
      expect(calculateScore(state)).toBe(250);
    });

    test("returns zero when score is depleted", () => {
      state.score = 0;
      expect(calculateScore(state)).toBe(0);
    });
  });

  describe("getSimulationSummary", () => {
    test("returns correct summary for fresh state", () => {
      const summary = getSimulationSummary(state);
      expect(summary).toEqual({
        step: 1,
        score: INITIAL_SCORE,
        failureCount: 0,
        isTerminated: false,
      });
    });

    test("returns correct summary after modifications", () => {
      state.score = 400;
      state.step = 5;
      state.failureCount = 3;
      const summary = getSimulationSummary(state);
      expect(summary).toEqual({
        step: 5,
        score: 400,
        failureCount: 3,
        isTerminated: false,
      });
    });

    test("reflects terminated state", () => {
      state.failureCount = FAILURE_THRESHOLD;
      const summary = getSimulationSummary(state);
      expect(summary.isTerminated).toBe(true);
    });
  });
});
