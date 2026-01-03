/**
 * Tools Tests
 *
 * Tests for src/tools/ (time, hello, memory, score, agentfs)
 */

import "dotenv/config";
import { beforeEach, describe, expect, test } from "bun:test";
import { helloTool } from "../src/tools/hello";

// LLM tests require API key
const hasApiKey = !!process.env.AI_GATEWAY_API_KEY;

import {
  kvDeleteTool,
  kvGetTool,
  kvListTool,
  kvSetTool,
  readScratchpadTool,
  writeScratchpadTool,
} from "../src/tools/memory";
import { adjustScoreTool, getScoreTool } from "../src/tools/score";
import { waitForNextStepTool } from "../src/tools/time";
import type { BaseState } from "../src/types/state";

// Helper to create mock context
const createContext = (state: BaseState) => ({
  experimental_context: state,
});

// Helper to execute a tool
const executeTool = <T>(
  tool: {
    execute: (input: T, context: { experimental_context: unknown }) => unknown;
  },
  input: T,
  state: BaseState
) => tool.execute(input, createContext(state));

// Create a fresh base state for testing
const createTestState = (): BaseState => ({
  step: 1,
  waitingForNextStep: false,
  score: 500,
  events: [],
  failureCount: 0,
  scratchpad: "",
  kvStore: {},
});

describe("tools", () => {
  let state: BaseState;

  beforeEach(() => {
    state = createTestState();
  });

  describe("waitForNextStepTool", () => {
    test("sets waitingForNextStep flag", () => {
      expect(state.waitingForNextStep).toBe(false);
      executeTool(waitForNextStepTool, {}, state);
      expect(state.waitingForNextStep).toBe(true);
    });

    test("returns current step", () => {
      state.step = 5;
      const result = executeTool(waitForNextStepTool, {}, state) as {
        currentStep: number;
      };
      expect(result.currentStep).toBe(5);
    });

    test("returns success message", () => {
      state.step = 3;
      const result = executeTool(waitForNextStepTool, {}, state) as {
        success: boolean;
        message: string;
      };
      expect(result.success).toBe(true);
      expect(result.message).toContain("step 3");
    });
  });

  describe("helloTool", () => {
    test("returns greeting with name", () => {
      const result = executeTool(helloTool, { name: "Alice" }, state) as {
        message: string;
      };
      expect(result.message).toBe("Hello, Alice.");
    });

    test("enthusiastic mode adds exclamation", () => {
      const result = executeTool(
        helloTool,
        { name: "Bob", enthusiastic: true },
        state
      ) as { message: string };
      expect(result.message).toBe("Hello, Bob! Great to meet you!");
    });

    test("includes current step", () => {
      state.step = 7;
      const result = executeTool(helloTool, { name: "Test" }, state) as {
        step: number;
      };
      expect(result.step).toBe(7);
    });

    test("includes timestamp", () => {
      const result = executeTool(helloTool, { name: "Test" }, state) as {
        timestamp: string;
      };
      expect(result.timestamp).toBeDefined();
      // Should be valid ISO string
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    test("handles missing state gracefully", () => {
      const result = helloTool.execute(
        { name: "Test" },
        { experimental_context: undefined }
      ) as { step: string | number };
      expect(result.step).toBe("unknown");
    });
  });

  describe("memory tools", () => {
    describe("readScratchpadTool", () => {
      test("returns empty content initially", () => {
        const result = executeTool(readScratchpadTool, {}, state) as {
          content: string;
          length: number;
        };
        expect(result.content).toBe("");
        expect(result.length).toBe(0);
      });

      test("returns content after write", () => {
        state.scratchpad = "Test notes";
        const result = executeTool(readScratchpadTool, {}, state) as {
          content: string;
        };
        expect(result.content).toBe("Test notes");
      });
    });

    describe("writeScratchpadTool", () => {
      test("overwrites content by default", () => {
        state.scratchpad = "Old content";
        executeTool(writeScratchpadTool, { content: "New content" }, state);
        expect(state.scratchpad).toBe("New content");
      });

      test("appends when flagged", () => {
        state.scratchpad = "First. ";
        executeTool(
          writeScratchpadTool,
          { content: "Second.", append: true },
          state
        );
        expect(state.scratchpad).toBe("First. Second.");
      });

      test("returns success and new length", () => {
        const result = executeTool(
          writeScratchpadTool,
          { content: "Hello" },
          state
        ) as {
          success: boolean;
          newLength: number;
        };
        expect(result.success).toBe(true);
        expect(result.newLength).toBe(5);
      });
    });

    describe("kvSetTool", () => {
      test("stores value", () => {
        executeTool(kvSetTool, { key: "name", value: "Alice" }, state);
        expect(state.kvStore.name).toBe("Alice");
      });

      test("returns overwritten status for new key", () => {
        const result = executeTool(
          kvSetTool,
          { key: "new", value: "value" },
          state
        ) as {
          overwritten: boolean;
        };
        expect(result.overwritten).toBe(false);
      });

      test("returns overwritten status for existing key", () => {
        state.kvStore.existing = "old";
        const result = executeTool(
          kvSetTool,
          { key: "existing", value: "new" },
          state
        ) as {
          overwritten: boolean;
        };
        expect(result.overwritten).toBe(true);
      });
    });

    describe("kvGetTool", () => {
      test("retrieves existing value", () => {
        state.kvStore.key = "value";
        const result = executeTool(kvGetTool, { key: "key" }, state) as {
          found: boolean;
          value: string;
        };
        expect(result.found).toBe(true);
        expect(result.value).toBe("value");
      });

      test("returns not found for missing key", () => {
        const result = executeTool(kvGetTool, { key: "missing" }, state) as {
          found: boolean;
          value: null;
        };
        expect(result.found).toBe(false);
        expect(result.value).toBe(null);
      });
    });

    describe("kvDeleteTool", () => {
      test("removes existing key", () => {
        state.kvStore.toDelete = "value";
        executeTool(kvDeleteTool, { key: "toDelete" }, state);
        expect(state.kvStore.toDelete).toBeUndefined();
      });

      test("returns success for existing key", () => {
        state.kvStore.existing = "value";
        const result = executeTool(
          kvDeleteTool,
          { key: "existing" },
          state
        ) as {
          success: boolean;
        };
        expect(result.success).toBe(true);
      });

      test("returns failure for missing key", () => {
        const result = executeTool(kvDeleteTool, { key: "missing" }, state) as {
          success: boolean;
        };
        expect(result.success).toBe(false);
      });
    });

    describe("kvListTool", () => {
      test("returns empty list initially", () => {
        const result = executeTool(kvListTool, {}, state) as {
          keys: string[];
          count: number;
        };
        expect(result.keys).toEqual([]);
        expect(result.count).toBe(0);
      });

      test("returns all keys", () => {
        state.kvStore.a = "1";
        state.kvStore.b = "2";
        state.kvStore.c = "3";
        const result = executeTool(kvListTool, {}, state) as {
          keys: string[];
          count: number;
        };
        expect(result.keys).toContain("a");
        expect(result.keys).toContain("b");
        expect(result.keys).toContain("c");
        expect(result.count).toBe(3);
      });
    });
  });

  describe("score tools", () => {
    describe("getScoreTool", () => {
      test("returns current score", () => {
        state.score = 750;
        const result = executeTool(getScoreTool, { limit: 10 }, state) as {
          score: number;
        };
        expect(result.score).toBe(750);
      });

      test("returns empty events initially", () => {
        const result = executeTool(getScoreTool, { limit: 10 }, state) as {
          events: unknown[];
        };
        expect(result.events).toEqual([]);
      });

      test("returns recent events", () => {
        state.events = [
          {
            id: "1",
            type: "reward",
            delta: 10,
            description: "First",
            timestamp: new Date(),
          },
          {
            id: "2",
            type: "cost",
            delta: -5,
            description: "Second",
            timestamp: new Date(),
          },
        ];
        const result = executeTool(getScoreTool, { limit: 10 }, state) as {
          events: { id: string }[];
        };
        expect(result.events.length).toBe(2);
      });

      test("respects limit parameter", () => {
        for (let i = 0; i < 20; i++) {
          state.events.push({
            id: `${i}`,
            type: "reward",
            delta: 1,
            description: `Event ${i}`,
            timestamp: new Date(),
          });
        }
        const result = executeTool(getScoreTool, { limit: 5 }, state) as {
          events: unknown[];
        };
        expect(result.events.length).toBe(5);
      });
    });

    describe("adjustScoreTool", () => {
      test("increases score with positive delta", () => {
        const initialScore = state.score;
        executeTool(
          adjustScoreTool,
          { delta: 100, reason: "Bonus", type: "reward" },
          state
        );
        expect(state.score).toBe(initialScore + 100);
      });

      test("decreases score with negative delta", () => {
        const initialScore = state.score;
        executeTool(
          adjustScoreTool,
          { delta: -50, reason: "Penalty", type: "penalty" },
          state
        );
        expect(state.score).toBe(initialScore - 50);
      });

      test("adds event to history", () => {
        expect(state.events.length).toBe(0);
        executeTool(
          adjustScoreTool,
          { delta: 10, reason: "Test", type: "reward" },
          state
        );
        expect(state.events.length).toBe(1);
      });

      test("event has correct fields", () => {
        executeTool(
          adjustScoreTool,
          { delta: 25, reason: "Test reason", type: "cost" },
          state
        );
        const event = state.events[0];
        expect(event?.type).toBe("cost");
        expect(event?.delta).toBe(25);
        expect(event?.description).toBe("Test reason");
        expect(event?.id).toBeDefined();
        expect(event?.timestamp).toBeDefined();
      });

      test("returns success and new score", () => {
        const result = executeTool(
          adjustScoreTool,
          { delta: 50, reason: "Reward", type: "reward" },
          state
        ) as {
          success: boolean;
          newScore: number;
        };
        expect(result.success).toBe(true);
        expect(result.newScore).toBe(550);
      });

      test("handles zero delta", () => {
        const initialScore = state.score;
        executeTool(
          adjustScoreTool,
          { delta: 0, reason: "No change", type: "reward" },
          state
        );
        expect(state.score).toBe(initialScore);
      });
    });
  });

  describe("agentfs", () => {
    // Import createAgent dynamically to avoid circular imports
    const getCreateAgent = async () => {
      const { createAgent } = await import("../src/agent");
      return createAgent;
    };

    test.skipIf(!hasApiKey)(
      "creates agent with agentfs tools (ephemeral)",
      async () => {
        const createAgent = await getCreateAgent();
        const { agent, state: agentState } = await createAgent(
          "google/gemini-3-flash",
          "silent",
          { useAgentFS: true }
        );

        expect(agent).toBeDefined();
        expect(agentState.agent).toBeDefined();

        const result = await agent.generate({
          prompt:
            "Use the kvSet tool to store key 'test' with value 'hello'. Then use kvGet to retrieve it. Then call waitForNextStep.",
          providerOptions: {
            gateway: { zeroDataRetention: false },
          },
        });

        expect(result).toBeDefined();
      },
      60_000
    );

    test("agentfs kv operations work", async () => {
      const createAgent = await getCreateAgent();
      const { state: agentState } = await createAgent(
        "google/gemini-3-flash",
        "silent",
        { useAgentFS: true }
      );

      const agentfs = agentState.agent;
      if (!agentfs) {
        throw new Error("AgentFS not initialized");
      }

      await agentfs.kv.set("direct-test", "works");
      const value = await agentfs.kv.get("direct-test");
      expect(value).toBe("works");

      await agentfs.kv.delete("direct-test");
      const deleted = await agentfs.kv.get("direct-test");
      expect(deleted).toBeUndefined();
    });

    test("agentfs fs operations work", async () => {
      const createAgent = await getCreateAgent();
      const { state: agentState } = await createAgent(
        "google/gemini-3-flash",
        "silent",
        { useAgentFS: true }
      );

      const agentfs = agentState.agent;
      if (!agentfs) {
        throw new Error("AgentFS not initialized");
      }

      await agentfs.fs.writeFile("/test.txt", "hello world");
      const content = await agentfs.fs.readFile("/test.txt", "utf-8");
      expect(content).toBe("hello world");

      const files = await agentfs.fs.readdir("/");
      expect(files).toContain("test.txt");

      await agentfs.fs.deleteFile("/test.txt");
    });
  });
});
