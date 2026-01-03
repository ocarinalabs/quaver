/**
 * Utils Tests
 *
 * Tests for src/utils/ (cost, fees)
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  fetchAllGenerationCosts,
  fetchCredits,
  fetchGenerationCost,
  type GenerationData,
} from "../src/utils/cost";

describe("cost utils", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.AI_GATEWAY_API_KEY;

  beforeEach(() => {
    process.env.AI_GATEWAY_API_KEY = "test-api-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.AI_GATEWAY_API_KEY = originalEnv;
  });

  describe("fetchGenerationCost", () => {
    test("returns null when API key is missing", async () => {
      process.env.AI_GATEWAY_API_KEY = undefined;
      const result = await fetchGenerationCost("gen-123");
      expect(result).toBeNull();
    });

    test("returns data on successful fetch", async () => {
      const mockData: GenerationData = {
        id: "gen-123",
        total_cost: 0.0025,
        usage: 1000,
        created_at: "2024-01-01T00:00:00Z",
        model: "gpt-4",
        is_byok: false,
        provider_name: "openai",
        streamed: true,
        latency: 500,
        generation_time: 450,
        tokens_prompt: 100,
        tokens_completion: 50,
        native_tokens_prompt: 100,
        native_tokens_completion: 50,
        native_tokens_reasoning: 0,
        native_tokens_cached: 0,
      };

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockData }),
        } as Response)
      );

      const result = await fetchGenerationCost("gen-123");
      expect(result).toEqual(mockData);
    });

    test("returns null on HTTP error", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        } as Response)
      );

      const result = await fetchGenerationCost("gen-123");
      expect(result).toBeNull();
    });

    test("returns null on network error", async () => {
      globalThis.fetch = mock(() => Promise.reject(new Error("Network error")));

      const result = await fetchGenerationCost("gen-123");
      expect(result).toBeNull();
    });
  });

  describe("fetchCredits", () => {
    test("returns null when API key is missing", async () => {
      process.env.AI_GATEWAY_API_KEY = undefined;
      const result = await fetchCredits();
      expect(result).toBeNull();
    });

    test("returns balance on successful fetch", async () => {
      const mockCredits = {
        balance: "100.50",
        total_used: "50.25",
      };

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCredits),
        } as Response)
      );

      const result = await fetchCredits();
      expect(result).toEqual(mockCredits);
    });

    test("returns null on HTTP error", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        } as Response)
      );

      const result = await fetchCredits();
      expect(result).toBeNull();
    });
  });

  describe("fetchAllGenerationCosts", () => {
    test("returns empty result for empty array", async () => {
      const result = await fetchAllGenerationCosts([]);
      expect(result.totalCost).toBe(0);
      expect(result.generations).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    test("returns all results when available immediately", async () => {
      const mockData: GenerationData = {
        id: "gen-1",
        total_cost: 0.01,
        usage: 500,
        created_at: "2024-01-01T00:00:00Z",
        model: "gpt-4",
        is_byok: false,
        provider_name: "openai",
        streamed: false,
        latency: 200,
        generation_time: 180,
        tokens_prompt: 50,
        tokens_completion: 25,
        native_tokens_prompt: 50,
        native_tokens_completion: 25,
        native_tokens_reasoning: 0,
        native_tokens_cached: 0,
      };

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockData }),
        } as Response)
      );

      const result = await fetchAllGenerationCosts(["gen-1"], {
        maxAttempts: 1,
        initialDelayMs: 10,
      });

      expect(result.generations).toHaveLength(1);
      expect(result.totalCost).toBe(0.01);
      expect(result.failed).toHaveLength(0);
    });

    test("adds to failed after max attempts", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        } as Response)
      );

      const result = await fetchAllGenerationCosts(["gen-fail"], {
        maxAttempts: 2,
        initialDelayMs: 10,
      });

      expect(result.generations).toHaveLength(0);
      expect(result.failed).toContain("gen-fail");
    });

    test("sums total cost correctly", async () => {
      let callCount = 0;
      const costs = [0.01, 0.02, 0.03];

      globalThis.fetch = mock(() => {
        const cost = costs[callCount] ?? 0;
        const mockData: GenerationData = {
          id: `gen-${callCount}`,
          total_cost: cost,
          usage: 100,
          created_at: "2024-01-01T00:00:00Z",
          model: "gpt-4",
          is_byok: false,
          provider_name: "openai",
          streamed: false,
          latency: 100,
          generation_time: 90,
          tokens_prompt: 10,
          tokens_completion: 5,
          native_tokens_prompt: 10,
          native_tokens_completion: 5,
          native_tokens_reasoning: 0,
          native_tokens_cached: 0,
        };
        callCount += 1;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockData }),
        } as Response);
      });

      const result = await fetchAllGenerationCosts(["a", "b", "c"], {
        maxAttempts: 1,
        initialDelayMs: 10,
      });

      expect(result.generations).toHaveLength(3);
      expect(result.totalCost).toBeCloseTo(0.06, 5);
    });
  });
});
