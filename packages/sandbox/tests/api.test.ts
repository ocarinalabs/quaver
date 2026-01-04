import { afterAll, describe, expect, test } from "bun:test";
import type { Sandbox } from "@daytonaio/api-client";
import { createDaytonaApi } from "../src/api";

const hasCredentials = (): boolean => Boolean(process.env.DAYTONA_API_KEY);

describe("api", () => {
  let testSandbox: Sandbox | undefined;
  const api = createDaytonaApi();

  afterAll(async () => {
    if (testSandbox) {
      try {
        await api.delete(testSandbox.id);
      } catch {
        // Already deleted
      }
    }
  });

  test.skipIf(!hasCredentials())(
    "create creates a sandbox",
    async () => {
      testSandbox = await api.create({ language: "typescript" });
      expect(testSandbox).toBeDefined();
      expect(testSandbox.id).toBeTruthy();
    },
    60_000
  );

  test.skipIf(!hasCredentials())("get retrieves sandbox by id", async () => {
    if (!testSandbox) {
      return;
    }
    const sandbox = await api.get(testSandbox.id);
    expect(sandbox.id).toBe(testSandbox.id);
  });

  test.skipIf(!hasCredentials())(
    "stop stops a running sandbox",
    async () => {
      if (!testSandbox) {
        return;
      }
      await api.stop(testSandbox.id);
      const sandbox = await api.get(testSandbox.id);
      expect(sandbox.state).toBe("stopped");
    },
    30_000
  );

  test.skipIf(!hasCredentials())(
    "start starts a stopped sandbox",
    async () => {
      if (!testSandbox) {
        return;
      }
      await api.start(testSandbox.id);
      const sandbox = await api.get(testSandbox.id);
      expect(sandbox.state).toBe("started");
    },
    30_000
  );

  test.skipIf(!hasCredentials())(
    "delete deletes a sandbox",
    async () => {
      if (!testSandbox) {
        return;
      }
      await api.delete(testSandbox.id);
      testSandbox = undefined;
    },
    30_000
  );
});
