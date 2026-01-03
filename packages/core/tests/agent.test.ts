/**
 * Agent Tests
 *
 * Tests for src/agent/ (createAgent, tools export)
 */

import { describe, expect, test } from "bun:test";
import { createAgent, tools } from "../src/agent";

describe("agent", () => {
  describe("tools export", () => {
    test("exports core tools", () => {
      expect(tools.getScore).toBeDefined();
      expect(tools.adjustScore).toBeDefined();
      expect(tools.waitForNextStep).toBeDefined();
      expect(tools.hello).toBeDefined();
    });

    test("exports memory tools", () => {
      expect(tools.readScratchpad).toBeDefined();
      expect(tools.writeScratchpad).toBeDefined();
      expect(tools.kvGet).toBeDefined();
      expect(tools.kvSet).toBeDefined();
      expect(tools.kvDelete).toBeDefined();
      expect(tools.kvList).toBeDefined();
    });
  });

  describe("createAgent", () => {
    test("creates agent with default in-memory tools", async () => {
      const { agent, state, logger } = await createAgent(
        "google/gemini-3-flash",
        "silent"
      );

      expect(agent).toBeDefined();
      expect(state).toBeDefined();
      expect(logger).toBeDefined();
      expect(state.agent).toBeUndefined();
    });

    test("creates agent with AgentFS when useAgentFS is true", async () => {
      const { agent, state } = await createAgent(
        "google/gemini-3-flash",
        "silent",
        { useAgentFS: true }
      );

      expect(agent).toBeDefined();
      expect(state.agent).toBeDefined();
    });

    test("initializes AgentFS with custom agentId", async () => {
      const customId = `test-agent-${Date.now()}`;
      const { state } = await createAgent("google/gemini-3-flash", "silent", {
        useAgentFS: true,
        agentId: customId,
      });

      expect(state.agent).toBeDefined();
    });

    test("initializes fresh state", async () => {
      const { state } = await createAgent("google/gemini-3-flash", "silent");

      expect(state.step).toBe(1);
      expect(state.score).toBe(500);
      expect(state.events).toHaveLength(0);
      expect(state.scratchpad).toBe("");
      expect(state.kvStore).toEqual({});
    });
  });
});
