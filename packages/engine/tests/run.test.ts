import { describe, expect, test } from "bun:test";
import { generateRunId, getAgentRunnerScript, runBenchmark } from "../src/run";

describe("generateRunId", () => {
  test("returns string with run- prefix", () => {
    expect(generateRunId().startsWith("run-")).toBe(true);
  });

  test("generates unique IDs", () => {
    const ids = new Set([generateRunId(), generateRunId(), generateRunId()]);
    expect(ids.size).toBe(3);
  });
});

describe("getAgentRunnerScript", () => {
  test("returns non-empty string", () => {
    expect(getAgentRunnerScript().length).toBeGreaterThan(0);
  });

  test("contains expected code", () => {
    expect(getAgentRunnerScript()).toContain("ANTHROPIC_API_KEY");
  });
});

describe("runBenchmark", () => {
  test("is exported", () => {
    expect(typeof runBenchmark).toBe("function");
  });
});
