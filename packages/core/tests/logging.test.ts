/**
 * Logging Tests
 *
 * Tests for src/logging/ (schemas, stream, types)
 */

import { describe, expect, test } from "bun:test";
import {
  BenchmarkLogEntry,
  EndLog,
  ProgressLog,
  parseLogFile,
  StartLog,
  StateLog,
  safeParseLogFile,
  ThinkingLog,
  ToolLog,
  TransitionLog,
  UsageLog,
} from "../src/logging/schemas";

// Valid log entries for testing
const validStartLog = {
  level: "30",
  time: "2024-01-01T10:00:00.000Z",
  benchmark: "test-bench",
  model: "test-model",
  msg: "Starting benchmark",
  type: "start",
};

const validEndLog = {
  level: "30",
  time: "2024-01-01T10:00:10.000Z",
  benchmark: true,
  msg: "Benchmark complete",
  type: "end",
};

const validThinkingLog = {
  level: "30",
  time: "2024-01-01T10:00:01.000Z",
  benchmark: true,
  msg: "Analyzing the situation",
  type: "thinking",
};

const validToolLog = {
  level: "30",
  time: "2024-01-01T10:00:02.000Z",
  benchmark: true,
  msg: "Called getScore",
  type: "tool",
  tool: "getScore",
  input: { query: "current" },
  output: { score: 500 },
};

const validTransitionLog = {
  level: "30",
  time: "2024-01-01T10:00:03.000Z",
  benchmark: true,
  msg: "State transition",
  type: "transition",
  from: "analyzing",
  to: "executing",
  balance: 100,
};

const validProgressLog = {
  level: "30",
  time: "2024-01-01T10:00:04.000Z",
  benchmark: true,
  msg: "Progress update",
  type: "progress",
  current: 5,
  total: 10,
  label: "Processing",
};

const validStateLog = {
  level: "30",
  time: "2024-01-01T10:00:05.000Z",
  benchmark: true,
  msg: "State snapshot",
  type: "state",
  label: "current_state",
  customField: "extra data",
};

const validUsageLog = {
  level: "30",
  time: "2024-01-01T10:00:06.000Z",
  benchmark: true,
  msg: "Token usage",
  type: "usage",
  inputTokens: 100,
  outputTokens: 50,
  inputTokenDetails: {
    cacheReadTokens: 20,
    cacheWriteTokens: 10,
  },
  outputTokenDetails: {
    textTokens: 40,
    reasoningTokens: 10,
  },
};

describe("logging", () => {
  describe("schemas", () => {
    describe("StartLog", () => {
      test("validates correct start log", () => {
        const result = StartLog.safeParse(validStartLog);
        expect(result.success).toBe(true);
      });

      test("requires benchmark field as string", () => {
        const invalid = { ...validStartLog, benchmark: true };
        const result = StartLog.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      test("requires model field", () => {
        const { model: _, ...invalid } = validStartLog;
        const result = StartLog.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      test("requires type literal 'start'", () => {
        const invalid = { ...validStartLog, type: "end" };
        const result = StartLog.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("EndLog", () => {
      test("validates correct end log", () => {
        const result = EndLog.safeParse(validEndLog);
        expect(result.success).toBe(true);
      });

      test("requires type literal 'end'", () => {
        const invalid = { ...validEndLog, type: "start" };
        const result = EndLog.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("ThinkingLog", () => {
      test("validates correct thinking log", () => {
        const result = ThinkingLog.safeParse(validThinkingLog);
        expect(result.success).toBe(true);
      });

      test("requires msg field", () => {
        const { msg: _, ...invalid } = validThinkingLog;
        const result = ThinkingLog.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("ToolLog", () => {
      test("validates correct tool log", () => {
        const result = ToolLog.safeParse(validToolLog);
        expect(result.success).toBe(true);
      });

      test("requires tool name", () => {
        const { tool: _, ...invalid } = validToolLog;
        const result = ToolLog.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      test("accepts any input/output types", () => {
        const withComplexData = {
          ...validToolLog,
          input: { nested: { data: [1, 2, 3] } },
          output: null,
        };
        const result = ToolLog.safeParse(withComplexData);
        expect(result.success).toBe(true);
      });
    });

    describe("TransitionLog", () => {
      test("validates correct transition log", () => {
        const result = TransitionLog.safeParse(validTransitionLog);
        expect(result.success).toBe(true);
      });

      test("requires from and to fields", () => {
        const { from: _, ...invalid } = validTransitionLog;
        const result = TransitionLog.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      test("optional balance, rating, fuel fields", () => {
        const minimal = {
          level: "30",
          time: "2024-01-01T10:00:00.000Z",
          benchmark: true,
          msg: "Transition",
          type: "transition",
          from: "a",
          to: "b",
        };
        const result = TransitionLog.safeParse(minimal);
        expect(result.success).toBe(true);
      });

      test("validates numeric optional fields", () => {
        const withAll = {
          ...validTransitionLog,
          balance: 100,
          rating: 4.5,
          fuel: 75,
        };
        const result = TransitionLog.safeParse(withAll);
        expect(result.success).toBe(true);
      });
    });

    describe("ProgressLog", () => {
      test("validates correct progress log", () => {
        const result = ProgressLog.safeParse(validProgressLog);
        expect(result.success).toBe(true);
      });

      test("requires current and total", () => {
        const { current: _, ...invalid } = validProgressLog;
        const result = ProgressLog.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      test("label is optional", () => {
        const { label: _, ...noLabel } = validProgressLog;
        const result = ProgressLog.safeParse(noLabel);
        expect(result.success).toBe(true);
      });
    });

    describe("StateLog", () => {
      test("validates correct state log", () => {
        const result = StateLog.safeParse(validStateLog);
        expect(result.success).toBe(true);
      });

      test("allows extra fields via passthrough", () => {
        const result = StateLog.safeParse(validStateLog);
        if (result.success) {
          expect((result.data as Record<string, unknown>).customField).toBe(
            "extra data"
          );
        }
      });

      test("requires label field", () => {
        const { label: _, ...invalid } = validStateLog;
        const result = StateLog.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("UsageLog", () => {
      test("validates correct usage log", () => {
        const result = UsageLog.safeParse(validUsageLog);
        expect(result.success).toBe(true);
      });

      test("all token fields are optional", () => {
        const minimal = {
          level: "30",
          time: "2024-01-01T10:00:00.000Z",
          benchmark: true,
          msg: "Usage",
          type: "usage",
        };
        const result = UsageLog.safeParse(minimal);
        expect(result.success).toBe(true);
      });

      test("validates token detail structures", () => {
        const result = UsageLog.safeParse(validUsageLog);
        if (result.success) {
          expect(result.data.inputTokenDetails?.cacheReadTokens).toBe(20);
          expect(result.data.outputTokenDetails?.reasoningTokens).toBe(10);
        }
      });
    });

    describe("BenchmarkLogEntry", () => {
      test("discriminates by type field", () => {
        expect(BenchmarkLogEntry.safeParse(validStartLog).success).toBe(true);
        expect(BenchmarkLogEntry.safeParse(validEndLog).success).toBe(true);
        expect(BenchmarkLogEntry.safeParse(validThinkingLog).success).toBe(
          true
        );
        expect(BenchmarkLogEntry.safeParse(validToolLog).success).toBe(true);
        expect(BenchmarkLogEntry.safeParse(validTransitionLog).success).toBe(
          true
        );
        expect(BenchmarkLogEntry.safeParse(validProgressLog).success).toBe(
          true
        );
        expect(BenchmarkLogEntry.safeParse(validStateLog).success).toBe(true);
        expect(BenchmarkLogEntry.safeParse(validUsageLog).success).toBe(true);
      });

      test("rejects invalid type", () => {
        const invalid = { ...validEndLog, type: "invalid_type" };
        const result = BenchmarkLogEntry.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      test("rejects missing type field", () => {
        const { type: _, ...invalid } = validEndLog;
        const result = BenchmarkLogEntry.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("parseLogFile", () => {
    test("parses valid NDJSON", () => {
      const content = [
        JSON.stringify(validStartLog),
        JSON.stringify(validThinkingLog),
        JSON.stringify(validEndLog),
      ].join("\n");

      const result = parseLogFile(content);
      expect(result.length).toBe(3);
      expect(result[0]?.type).toBe("start");
      expect(result[2]?.type).toBe("end");
    });

    test("handles empty lines", () => {
      const content = [
        JSON.stringify(validStartLog),
        "",
        JSON.stringify(validEndLog),
        "",
      ].join("\n");

      const result = parseLogFile(content);
      expect(result.length).toBe(2);
    });

    test("throws on invalid JSON", () => {
      const content = "not valid json";
      expect(() => parseLogFile(content)).toThrow();
    });

    test("throws on schema mismatch", () => {
      const content = JSON.stringify({ invalid: "data" });
      expect(() => parseLogFile(content)).toThrow();
    });

    test("handles empty file", () => {
      const result = parseLogFile("");
      expect(result).toEqual([]);
    });
  });

  describe("safeParseLogFile", () => {
    test("returns success with valid logs", () => {
      const content = [
        JSON.stringify(validStartLog),
        JSON.stringify(validEndLog),
      ].join("\n");

      const result = safeParseLogFile(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    test("returns errors for invalid entries", () => {
      const content = [
        JSON.stringify(validStartLog),
        JSON.stringify({ type: "invalid", msg: "bad" }),
      ].join("\n");

      const result = safeParseLogFile(content);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    test("skips non-JSON lines", () => {
      const content = [
        JSON.stringify(validStartLog),
        "not json at all",
        JSON.stringify(validEndLog),
      ].join("\n");

      const result = safeParseLogFile(content);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    test("handles empty content", () => {
      const result = safeParseLogFile("");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    test("collects all validation errors", () => {
      const content = [
        JSON.stringify({ type: "invalid1" }),
        JSON.stringify({ type: "invalid2" }),
      ].join("\n");

      const result = safeParseLogFile(content);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBe(2);
      }
    });
  });
});
